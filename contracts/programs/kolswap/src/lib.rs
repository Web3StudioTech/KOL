use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("KSwpXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

// Fee constants (same as bonding curve)
pub const PLATFORM_FEE_WALLET: &str = "9peNy7uVBNGvTQVAtr5WaWwpNPAgAVTWSZxQvaG9XjX8";
pub const KOL_POOL_WALLET: &str     = "FMF6jcpiA72PFqcTiLESL2R6SKVYo23duQ2rRx8CQSpN";
pub const PLATFORM_FEE_BPS: u64     = 90;
pub const CREATOR_FEE_BPS: u64      = 15;
pub const KOL_POOL_FEE_BPS: u64     = 15;
pub const REFERRAL_FEE_BPS: u64     = 5;
pub const BPS_DENOMINATOR: u64      = 10000;

// KOL reward multipliers (basis points on top of base reward)
pub const KOL_MULTIPLIER_BPS: u64      = 10000; // 1.0x
pub const PRO_KOL_MULTIPLIER_BPS: u64  = 12500; // 1.25x
pub const GOLD_KOL_MULTIPLIER_BPS: u64 = 15000; // 1.5x

#[program]
pub mod kolswap {
    use super::*;

    // ── Create liquidity pool for graduated token ─────────────
    pub fn create_pool(
        ctx: Context<CreatePool>,
        sol_amount: u64,
        token_amount: u64,
        bump: u8,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.mint            = ctx.accounts.mint.key();
        pool.creator         = ctx.accounts.creator.key();
        pool.sol_reserve     = sol_amount;
        pool.token_reserve   = token_amount;
        pool.total_volume_usd = 0;
        pool.total_fees_sol  = 0;
        pool.is_active       = true;
        pool.bump            = bump;
        pool.created_at      = Clock::get()?.unix_timestamp;

        emit!(PoolCreated {
            mint: pool.mint,
            creator: pool.creator,
            initial_sol: sol_amount,
            initial_tokens: token_amount,
            timestamp: pool.created_at,
        });

        Ok(())
    }

    // ── Buy tokens on KOLSwap ─────────────────────────────────
    pub fn swap_sol_for_tokens(
        ctx: Context<Swap>,
        sol_in: u64,
        min_tokens_out: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        require!(ctx.accounts.pool.is_active, ErrorCode::PoolNotActive);
        require!(sol_in > 0, ErrorCode::ZeroAmount);

        let pool = &mut ctx.accounts.pool;

        // Calculate fees
        let fees = calculate_fees(sol_in);
        let sol_after_fees = sol_in - fees.total;

        // x*y=k AMM formula
        // tokens_out = token_reserve * sol_after_fees / (sol_reserve + sol_after_fees)
        let tokens_out = pool.token_reserve
            .checked_mul(sol_after_fees).unwrap()
            .checked_div(pool.sol_reserve + sol_after_fees).unwrap();

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out < pool.token_reserve, ErrorCode::InsufficientLiquidity);

        // Distribute fees
        distribute_fees_kolswap(&ctx, &fees, referrer)?;

        // Update reserves
        pool.sol_reserve   += sol_after_fees;
        pool.token_reserve -= tokens_out;

        let volume_usd = lamports_to_usd_approx(sol_in);
        pool.total_volume_usd += volume_usd;
        pool.total_fees_sol   += fees.total;

        // Transfer tokens to buyer
        let seeds = &[b"pool", pool.mint.as_ref(), &[pool.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_token_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;

        emit!(SwapExecuted {
            mint: pool.mint,
            user: ctx.accounts.user.key(),
            sol_in,
            tokens_out,
            direction: SwapDirection::SolForTokens,
            new_price: get_pool_price(pool),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Sell tokens on KOLSwap ────────────────────────────────
    pub fn swap_tokens_for_sol(
        ctx: Context<Swap>,
        tokens_in: u64,
        min_sol_out: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        require!(ctx.accounts.pool.is_active, ErrorCode::PoolNotActive);
        require!(tokens_in > 0, ErrorCode::ZeroAmount);

        let pool = &mut ctx.accounts.pool;

        // sol_out = sol_reserve * tokens_in / (token_reserve + tokens_in)
        let sol_out = pool.sol_reserve
            .checked_mul(tokens_in).unwrap()
            .checked_div(pool.token_reserve + tokens_in).unwrap();

        let fees = calculate_fees(sol_out);
        let sol_after_fees = sol_out - fees.total;

        require!(sol_after_fees >= min_sol_out, ErrorCode::SlippageExceeded);

        // Transfer tokens from user to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            tokens_in,
        )?;

        // Distribute fees
        distribute_fees_kolswap(&ctx, &fees, referrer)?;

        // Update reserves
        pool.token_reserve += tokens_in;
        pool.sol_reserve   -= sol_out;

        let volume_usd = lamports_to_usd_approx(sol_out);
        pool.total_volume_usd += volume_usd;
        pool.total_fees_sol   += fees.total;

        // Send SOL to user
        **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? -= sol_after_fees;
        **ctx.accounts.user.try_borrow_mut_lamports()?           += sol_after_fees;

        emit!(SwapExecuted {
            mint: pool.mint,
            user: ctx.accounts.user.key(),
            sol_in: tokens_in,
            tokens_out: sol_after_fees,
            direction: SwapDirection::TokensForSol,
            new_price: get_pool_price(pool),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Pay KOL reward from pool ──────────────────────────────
    pub fn pay_kol_reward(
        ctx: Context<PayKolReward>,
        base_reward_lamports: u64,
        badge_tier: u8,
    ) -> Result<()> {
        // Apply badge multiplier
        let multiplier = match badge_tier {
            1 => KOL_MULTIPLIER_BPS,
            2 => PRO_KOL_MULTIPLIER_BPS,
            3 => GOLD_KOL_MULTIPLIER_BPS,
            _ => KOL_MULTIPLIER_BPS,
        };

        let final_reward = base_reward_lamports
            .checked_mul(multiplier).unwrap()
            .checked_div(10000).unwrap();

        // Transfer from KOL pool to KOL wallet
        **ctx.accounts.kol_pool_vault.try_borrow_mut_lamports()? -= final_reward;
        **ctx.accounts.kol_wallet.try_borrow_mut_lamports()?     += final_reward;

        emit!(KolRewardPaid {
            kol: ctx.accounts.kol_wallet.key(),
            amount: final_reward,
            badge_tier,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ── Fee helpers ───────────────────────────────────────────────
pub struct FeeBreakdown {
    pub platform: u64,
    pub creator:  u64,
    pub kol_pool: u64,
    pub referral: u64,
    pub total:    u64,
}

pub fn calculate_fees(amount: u64) -> FeeBreakdown {
    let platform = amount * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
    let creator  = amount * CREATOR_FEE_BPS  / BPS_DENOMINATOR;
    let kol_pool = amount * KOL_POOL_FEE_BPS / BPS_DENOMINATOR;
    let referral = amount * REFERRAL_FEE_BPS  / BPS_DENOMINATOR;
    FeeBreakdown { platform, creator, kol_pool, referral, total: platform + creator + kol_pool + referral }
}

pub fn distribute_fees_kolswap(
    ctx: &Context<Swap>,
    fees: &FeeBreakdown,
    _referrer: Option<Pubkey>,
) -> Result<()> {
    let payer = ctx.accounts.user.to_account_info();

    macro_rules! transfer_sol {
        ($to:expr, $amount:expr) => {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: payer.clone(),
                        to: $to,
                    },
                ),
                $amount,
            )?;
        };
    }

    transfer_sol!(ctx.accounts.platform_fee_wallet.to_account_info(), fees.platform);
    transfer_sol!(ctx.accounts.kol_pool_wallet.to_account_info(), fees.kol_pool);
    transfer_sol!(ctx.accounts.creator_wallet.to_account_info(), fees.creator);
    transfer_sol!(ctx.accounts.referral_wallet.to_account_info(), fees.referral);

    Ok(())
}

pub fn get_pool_price(pool: &PoolState) -> u64 {
    if pool.token_reserve == 0 { return 0; }
    pool.sol_reserve
        .checked_mul(1_000_000_000).unwrap()
        .checked_div(pool.token_reserve).unwrap()
}

pub fn lamports_to_usd_approx(lamports: u64) -> u64 {
    lamports.checked_mul(150).unwrap().checked_div(1_000_000_000).unwrap()
}

// ── Accounts ──────────────────────────────────────────────────
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + PoolState::SIZE,
        seeds = [b"pool", mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, PoolState>,
    pub mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub pool_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    /// CHECK: pool SOL vault
    #[account(mut, seeds = [b"pool_sol", pool.mint.as_ref()], bump)]
    pub pool_sol_vault: UncheckedAccount<'info>,
    /// CHECK: fee wallets
    #[account(mut, constraint = platform_fee_wallet.key().to_string() == PLATFORM_FEE_WALLET)]
    pub platform_fee_wallet: UncheckedAccount<'info>,
    #[account(mut, constraint = kol_pool_wallet.key().to_string() == KOL_POOL_WALLET)]
    pub kol_pool_wallet: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,
    #[account(mut)]
    pub referral_wallet: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayKolReward<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: KOL pool vault
    #[account(mut, constraint = kol_pool_vault.key().to_string() == KOL_POOL_WALLET)]
    pub kol_pool_vault: UncheckedAccount<'info>,
    /// CHECK: KOL wallet receiving reward
    #[account(mut)]
    pub kol_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// ── State ─────────────────────────────────────────────────────
#[account]
pub struct PoolState {
    pub mint:             Pubkey,
    pub creator:          Pubkey,
    pub sol_reserve:      u64,
    pub token_reserve:    u64,
    pub total_volume_usd: u64,
    pub total_fees_sol:   u64,
    pub is_active:        bool,
    pub bump:             u8,
    pub created_at:       i64,
}
impl PoolState {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 64;
}

// ── Events ────────────────────────────────────────────────────
#[event]
pub struct PoolCreated {
    pub mint:            Pubkey,
    pub creator:         Pubkey,
    pub initial_sol:     u64,
    pub initial_tokens:  u64,
    pub timestamp:       i64,
}

#[event]
pub struct SwapExecuted {
    pub mint:      Pubkey,
    pub user:      Pubkey,
    pub sol_in:    u64,
    pub tokens_out: u64,
    pub direction: SwapDirection,
    pub new_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct KolRewardPaid {
    pub kol:        Pubkey,
    pub amount:     u64,
    pub badge_tier: u8,
    pub timestamp:  i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SwapDirection {
    SolForTokens,
    TokensForSol,
}

// ── Errors ────────────────────────────────────────────────────
#[error_code]
pub enum ErrorCode {
    #[msg("Pool is not active")]
    PoolNotActive,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
}
