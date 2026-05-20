use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("KPassXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

// ── Constants ─────────────────────────────────────────────────
pub const PLATFORM_FEE_WALLET: &str = "9peNy7uVBNGvTQVAtr5WaWwpNPAgAVTWSZxQvaG9XjX8";
pub const MAX_SUPPLY: u64           = 10_000;
pub const VOLUME_THRESHOLD: u64     = 1_000_000_000_000; // $1M in micro-USD

#[program]
pub mod kol_pass {
    use super::*;

    // ── Initialize the KOL Pass collection ───────────────────
    pub fn initialize(
        ctx: Context<Initialize>,
        bump: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.pass_state;
        state.authority        = ctx.accounts.authority.key();
        state.total_minted     = 0;
        state.max_supply       = MAX_SUPPLY;
        state.volume_threshold = VOLUME_THRESHOLD;
        state.bump             = bump;

        emit!(CollectionInitialized {
            authority: state.authority,
            max_supply: MAX_SUPPLY,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Mint a KOL Pass when token hits $1M volume ───────────
    // Called by platform backend when milestone detected
    pub fn mint_pass(
        ctx: Context<MintPass>,
        token_mint: Pubkey,
        creator: Pubkey,
        total_volume_usd: u64,
        pass_number: u64,
        bump: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.pass_state;

        // Validations
        require!(
            state.total_minted < state.max_supply,
            ErrorCode::MaxSupplyReached
        );
        require!(
            total_volume_usd >= state.volume_threshold,
            ErrorCode::VolumeThresholdNotMet
        );
        require!(
            state.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        // Record pass
        let pass_record = &mut ctx.accounts.pass_record;
        pass_record.pass_number     = pass_number;
        pass_record.token_mint      = token_mint;
        pass_record.creator         = creator;
        pass_record.holder          = ctx.accounts.creator_wallet.key();
        pass_record.total_volume_at_mint = total_volume_usd;
        pass_record.status          = PassStatus::Active;
        pass_record.minted_at       = Clock::get()?.unix_timestamp;
        pass_record.bump            = bump;

        // Increment counter
        state.total_minted += 1;

        emit!(PassMinted {
            pass_number,
            token_mint,
            creator,
            holder: ctx.accounts.creator_wallet.key(),
            total_volume_usd,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Freeze pass when rug detected ────────────────────────
    pub fn freeze_pass(
        ctx: Context<AdminPassAction>,
        reason: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.pass_state.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        ctx.accounts.pass_record.status = PassStatus::Frozen;

        emit!(PassFrozen {
            pass_number: ctx.accounts.pass_record.pass_number,
            reason,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Burn pass after community vote ───────────────────────
    pub fn burn_pass(ctx: Context<AdminPassAction>) -> Result<()> {
        require!(
            ctx.accounts.pass_state.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        ctx.accounts.pass_record.status = PassStatus::Burned;

        // Decrement total (burned passes don't count toward max)
        // This makes remaining passes slightly more scarce
        ctx.accounts.pass_state.total_minted = ctx.accounts.pass_state.total_minted.saturating_sub(1);

        emit!(PassBurned {
            pass_number: ctx.accounts.pass_record.pass_number,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Transfer pass to community wallet ────────────────────
    pub fn transfer_to_community(
        ctx: Context<TransferPass>,
        community_wallet: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.pass_record.status == PassStatus::Frozen,
            ErrorCode::PassNotFrozen
        );

        ctx.accounts.pass_record.holder = community_wallet;
        ctx.accounts.pass_record.status = PassStatus::Community;

        emit!(PassTransferred {
            pass_number: ctx.accounts.pass_record.pass_number,
            new_holder: community_wallet,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + PassState::SIZE,
        seeds = [b"pass_state"],
        bump
    )]
    pub pass_state: Account<'info, PassState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(token_mint: Pubkey, creator: Pubkey, total_volume_usd: u64, pass_number: u64, bump: u8)]
pub struct MintPass<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"pass_state"], bump = pass_state.bump)]
    pub pass_state: Account<'info, PassState>,
    #[account(
        init,
        payer = authority,
        space = 8 + PassRecord::SIZE,
        seeds = [b"pass_record", token_mint.as_ref()],
        bump
    )]
    pub pass_record: Account<'info, PassRecord>,
    /// CHECK: creator wallet receiving the pass
    pub creator_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminPassAction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"pass_state"], bump = pass_state.bump)]
    pub pass_state: Account<'info, PassState>,
    #[account(mut)]
    pub pass_record: Account<'info, PassRecord>,
}

#[derive(Accounts)]
pub struct TransferPass<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"pass_state"], bump = pass_state.bump)]
    pub pass_state: Account<'info, PassState>,
    #[account(mut)]
    pub pass_record: Account<'info, PassRecord>,
}

// ── State accounts ────────────────────────────────────────────
#[account]
pub struct PassState {
    pub authority:        Pubkey,
    pub total_minted:     u64,
    pub max_supply:       u64,
    pub volume_threshold: u64,
    pub bump:             u8,
}
impl PassState {
    pub const SIZE: usize = 32 + 8 + 8 + 8 + 1 + 64;
}

#[account]
pub struct PassRecord {
    pub pass_number:           u64,
    pub token_mint:            Pubkey,
    pub creator:               Pubkey,
    pub holder:                Pubkey,
    pub total_volume_at_mint:  u64,
    pub status:                PassStatus,
    pub minted_at:             i64,
    pub bump:                  u8,
}
impl PassRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 8 + 1 + 64;
}

// ── Enums ─────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PassStatus {
    Active,
    Frozen,
    Burned,
    Community,
}

// ── Events ────────────────────────────────────────────────────
#[event]
pub struct CollectionInitialized {
    pub authority:  Pubkey,
    pub max_supply: u64,
    pub timestamp:  i64,
}

#[event]
pub struct PassMinted {
    pub pass_number:      u64,
    pub token_mint:       Pubkey,
    pub creator:          Pubkey,
    pub holder:           Pubkey,
    pub total_volume_usd: u64,
    pub timestamp:        i64,
}

#[event]
pub struct PassFrozen {
    pub pass_number: u64,
    pub reason:      String,
    pub timestamp:   i64,
}

#[event]
pub struct PassBurned {
    pub pass_number: u64,
    pub timestamp:   i64,
}

#[event]
pub struct PassTransferred {
    pub pass_number: u64,
    pub new_holder:  Pubkey,
    pub timestamp:   i64,
}

// ── Errors ────────────────────────────────────────────────────
#[error_code]
pub enum ErrorCode {
    #[msg("Maximum KOL Pass supply of 10,000 has been reached")]
    MaxSupplyReached,
    #[msg("Token has not reached $1M cumulative volume threshold")]
    VolumeThresholdNotMet,
    #[msg("Only platform authority can perform this action")]
    Unauthorized,
    #[msg("Pass must be frozen before community transfer")]
    PassNotFrozen,
    #[msg("Pass has already been burned")]
    PassAlreadyBurned,
}
