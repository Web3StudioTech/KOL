use anchor_lang::prelude::*;

declare_id!("VoteXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

pub const VOTE_DURATION_SECONDS: i64 = 72 * 60 * 60; // 72 hours
pub const QUORUM_BPS: u64            = 1000;          // 10%
pub const BPS_DENOMINATOR: u64       = 10000;

#[program]
pub mod community_vote {
    use super::*;

    // ── Open a community vote (triggered by rug detection) ────
    pub fn open_vote(
        ctx: Context<OpenVote>,
        token_mint: Pubkey,
        rug_trigger: RugTrigger,
        total_eligible_wallets: u64,
        total_eligible_tokens: u64,
        snapshot_block: String,
        bump: u8,
    ) -> Result<()> {
        let vote = &mut ctx.accounts.vote;
        let now = Clock::get()?.unix_timestamp;

        vote.token_mint             = token_mint;
        vote.rug_trigger            = rug_trigger.clone();
        vote.status                 = VoteStatus::Active;
        vote.snapshot_block         = snapshot_block;
        vote.snapshot_at            = now;
        vote.total_eligible_wallets = total_eligible_wallets;
        vote.total_eligible_tokens  = total_eligible_tokens;
        vote.burn_votes             = 0;
        vote.community_votes        = 0;
        vote.burn_wallet_count      = 0;
        vote.community_wallet_count = 0;

        // Quorum = 10% of eligible wallets
        vote.quorum_required = total_eligible_wallets
            .checked_mul(QUORUM_BPS).unwrap()
            .checked_div(BPS_DENOMINATOR).unwrap();

        vote.expires_at = now + VOTE_DURATION_SECONDS;
        vote.bump       = bump;
        vote.opened_at  = now;

        emit!(VoteOpened {
            token_mint,
            rug_trigger,
            expires_at: vote.expires_at,
            quorum_required: vote.quorum_required,
            timestamp: now,
        });

        Ok(())
    }

    // ── Cast a vote ───────────────────────────────────────────
    pub fn cast_vote(
        ctx: Context<CastVote>,
        choice: VoteChoice,
        token_balance: u64,
        wallet_signature: String,
    ) -> Result<()> {
        let vote = &mut ctx.accounts.vote;
        let now  = Clock::get()?.unix_timestamp;

        // Validations
        require!(vote.status == VoteStatus::Active, ErrorCode::VoteNotActive);
        require!(now < vote.expires_at, ErrorCode::VoteExpired);
        require!(token_balance > 0, ErrorCode::NoTokenBalance);

        // Prevent creator from voting
        require!(
            ctx.accounts.voter.key() != ctx.accounts.token_creator.key(),
            ErrorCode::CreatorCannotVote
        );

        // Record vote
        let vote_record = &mut ctx.accounts.vote_record;
        vote_record.vote         = ctx.accounts.vote.key();
        vote_record.voter        = ctx.accounts.voter.key();
        vote_record.token_balance = token_balance;
        vote_record.choice       = choice.clone();
        vote_record.signature    = wallet_signature;
        vote_record.voted_at     = now;

        // Tally
        match choice {
            VoteChoice::Burn => {
                vote.burn_votes         += token_balance;
                vote.burn_wallet_count  += 1;
            }
            VoteChoice::Community => {
                vote.community_votes         += token_balance;
                vote.community_wallet_count  += 1;
            }
        }

        // Check quorum
        let total_wallets_voted = vote.burn_wallet_count + vote.community_wallet_count;
        if total_wallets_voted >= vote.quorum_required {
            vote.quorum_reached = true;
        }

        emit!(VoteCast {
            token_mint: vote.token_mint,
            voter: ctx.accounts.voter.key(),
            choice,
            token_balance,
            timestamp: now,
        });

        Ok(())
    }

    // ── Finalize vote (called after 72h) ──────────────────────
    pub fn finalize_vote(ctx: Context<FinalizeVote>) -> Result<()> {
        let vote = &mut ctx.accounts.vote;
        let now  = Clock::get()?.unix_timestamp;

        require!(vote.status == VoteStatus::Active, ErrorCode::VoteNotActive);
        require!(now >= vote.expires_at, ErrorCode::VoteNotExpired);

        // Check quorum
        if !vote.quorum_reached {
            vote.status  = VoteStatus::Completed;
            vote.outcome = VoteOutcome::QuorumFailed;
            // Auto-burn: pass is burned when quorum not reached
            emit!(VoteFinalized {
                token_mint: vote.token_mint,
                outcome: VoteOutcome::QuorumFailed,
                burn_votes: vote.burn_votes,
                community_votes: vote.community_votes,
                quorum_reached: false,
                timestamp: now,
            });
            return Ok(());
        }

        // Determine winner
        let outcome = if vote.burn_votes >= vote.community_votes {
            VoteOutcome::Burn
        } else {
            VoteOutcome::Community
        };

        vote.status     = VoteStatus::Completed;
        vote.outcome    = outcome.clone();
        vote.finalized_at = now;

        emit!(VoteFinalized {
            token_mint: vote.token_mint,
            outcome,
            burn_votes: vote.burn_votes,
            community_votes: vote.community_votes,
            quorum_reached: true,
            timestamp: now,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(token_mint: Pubkey, bump: u8)]
pub struct OpenVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + VoteState::SIZE,
        seeds = [b"vote", token_mint.as_ref()],
        bump
    )]
    pub vote: Account<'info, VoteState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut, seeds = [b"vote", vote.token_mint.as_ref()], bump = vote.bump)]
    pub vote: Account<'info, VoteState>,
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::SIZE,
        seeds = [b"vote_record", vote.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    /// CHECK: token creator — excluded from voting
    pub token_creator: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"vote", vote.token_mint.as_ref()], bump = vote.bump)]
    pub vote: Account<'info, VoteState>,
}

// ── State ─────────────────────────────────────────────────────
#[account]
pub struct VoteState {
    pub token_mint:              Pubkey,
    pub rug_trigger:             RugTrigger,
    pub status:                  VoteStatus,
    pub snapshot_block:          String,
    pub snapshot_at:             i64,
    pub total_eligible_wallets:  u64,
    pub total_eligible_tokens:   u64,
    pub burn_votes:              u64,
    pub community_votes:         u64,
    pub burn_wallet_count:       u64,
    pub community_wallet_count:  u64,
    pub quorum_required:         u64,
    pub quorum_reached:          bool,
    pub outcome:                 VoteOutcome,
    pub expires_at:              i64,
    pub opened_at:               i64,
    pub finalized_at:            i64,
    pub bump:                    u8,
}
impl VoteState {
    pub const SIZE: usize = 32 + 1 + 1 + 68 + 8*10 + 1 + 1 + 8 + 8 + 8 + 1 + 128;
}

#[account]
pub struct VoteRecord {
    pub vote:          Pubkey,
    pub voter:         Pubkey,
    pub token_balance: u64,
    pub choice:        VoteChoice,
    pub signature:     String,
    pub voted_at:      i64,
}
impl VoteRecord {
    pub const SIZE: usize = 32 + 32 + 8 + 1 + 100 + 8 + 64;
}

// ── Enums ─────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VoteStatus { Active, Completed }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VoteChoice { Burn, Community }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VoteOutcome { Burn, Community, QuorumFailed }

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum RugTrigger {
    CreatorMassSell,
    CreatorWalletZeroed,
    LiquidityPulled,
    CoordinatedDump,
}

// ── Events ────────────────────────────────────────────────────
#[event]
pub struct VoteOpened {
    pub token_mint:      Pubkey,
    pub rug_trigger:     RugTrigger,
    pub expires_at:      i64,
    pub quorum_required: u64,
    pub timestamp:       i64,
}

#[event]
pub struct VoteCast {
    pub token_mint:   Pubkey,
    pub voter:        Pubkey,
    pub choice:       VoteChoice,
    pub token_balance: u64,
    pub timestamp:    i64,
}

#[event]
pub struct VoteFinalized {
    pub token_mint:     Pubkey,
    pub outcome:        VoteOutcome,
    pub burn_votes:     u64,
    pub community_votes: u64,
    pub quorum_reached: bool,
    pub timestamp:      i64,
}

// ── Errors ────────────────────────────────────────────────────
#[error_code]
pub enum ErrorCode {
    #[msg("Vote is not active")]
    VoteNotActive,
    #[msg("Vote has expired")]
    VoteExpired,
    #[msg("Vote has not expired yet")]
    VoteNotExpired,
    #[msg("No token balance at snapshot")]
    NoTokenBalance,
    #[msg("Token creator cannot vote")]
    CreatorCannotVote,
    #[msg("Already voted")]
    AlreadyVoted,
}
