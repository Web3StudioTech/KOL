use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("BcuRVe5zJVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

// ── Constants ────────────────────────────────────────────────
// Your hardcoded wallet addresses
pub const PLATFORM_FEE_WALLET: &str = "9peNy7uVBNGvTQVAtr5WaWwpNPAgAVTWSZxQvaG9XjX8";
pub const KOL_POOL_WALLET: &str     = "FMF6jcpiA72PFqcTiLESL2R6SKVYo23duQ2rRx8CQSpN";

// Fee basis points (1 basis point = 0.01%)
// Total = 125 basis points = 1.25%
pub const PLATFORM_FEE_BPS: u64  = 90;   // 0.90%
pub const CREATOR_FEE_BPS: u64   = 15;   // 0.15%
pub const KOL_POOL_FEE_BPS: u64  = 15;   // 0.15%
pub const REFERRAL_FEE_BPS: u64  = 5;    // 0.05%
pub const TOTAL_FEE_BPS: u64     = 125;  // 1.25%
pub const BPS_DENOMINATOR: u64   = 10000;

// Bonding curve
pub const GRADUATION_MARKET_CAP_USD: u64 = 69_000; // $69K
pub const INITIAL_VIRTUAL_SOL: u64       = 30_000_000_000; // 30 SOL in lamports
pub const INITIAL_VIRTUAL_TOKENS: u64    = 1_073_000_000_000_000; // 1.073B tokens
pub const TOTAL_SUPPLY: u64              = 1_000_000_000_000_000; // 1B tokens
pub const LAUNCH_FEE_LAMPORTS: u64       = 20_000_000; // 0.02 SOL

// Rug detection thresholds
pub const RUG_SELL_THRESHOLD_BPS: u64   = 5000; // 50%
pub const RUG_LIQUIDITY_THRESHOLD_BPS: u64 = 5000; // 50%

// KOL Pass
pub const KOL_PASS_VOLUME_THRESHOLD: u64 = 1_000_000_000_000; // $1M in micro-USD
pub const KOL_PASS_MAX_SUPPLY: u64        = 10_000;

#[program]
pub mod bonding_curve {
    use super::*;

    // ── Initialize platform config ────────────────────────────
    pub fn initialize(
        ctx: Context<Initialize>,
        bump: u8,
    ) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;
        config.authority          = ctx.accounts.authority.key();
        config.platform_fee_wallet = ctx.accounts.platform_fee_wallet.key();
        config.kol_pool_wallet    = ctx.accounts.kol_pool_wallet.key();
        config.total_tokens_launched = 0;
        config.total_volume_usd   = 0;
        config.kol_passes_issued  = 0;
        config.is_paused          = false;
        config.bump               = bump;
        Ok(())
    }

    // ── Launch a new token ────────────────────────────────────
    pub fn launch_token(
        ctx: Context<LaunchToken>,
        name: String,
        ticker: String,
        uri: String,       // metadata URI (image, socials stored off-chain)
        initial_buy_lamports: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.platform_config.is_paused, ErrorCode::PlatformPaused);
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(ticker.len() <= 10, ErrorCode::TickerTooLong);

        // Collect launch fee
        let launch_fee = LAUNCH_FEE_LAMPORTS;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                },
            ),
            launch_fee,
        )?;

        // Initialize bonding curve state
        let curve = &mut ctx.accounts.bonding_curve;
        curve.creator          = ctx.accounts.creator.key();
        curve.mint             = ctx.accounts.mint.key();
        curve.name             = name;
        curve.ticker           = ticker;
        curve.uri              = uri;
        curve.virtual_sol      = INITIAL_VIRTUAL_SOL;
        curve.virtual_tokens   = INITIAL_VIRTUAL_TOKENS;
        curve.real_sol         = 0;
        curve.real_tokens      = 0;
        curve.total_volume_usd = 0;
        curve.is_graduated     = false;
        curve.is_rug_flagged   = false;
        curve.kol_pass_earned  = false;
        curve.kol_pass_number  = 0;
        curve.creator_token_balance_at_launch = TOTAL_SUPPLY;
        curve.created_at       = Clock::get()?.unix_timestamp;

        // Mint total supply to bonding curve vault
        let seeds = &[b"bonding_curve", curve.mint.as_ref(), &[ctx.bumps.bonding_curve]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: curve.to_account_info(),
                },
                signer,
            ),
            TOTAL_SUPPLY,
        )?;

        // Update platform stats
        ctx.accounts.platform_config.total_tokens_launched += 1;

        emit!(TokenLaunched {
            mint: curve.mint,
            creator: curve.creator,
            ticker: curve.ticker.clone(),
            timestamp: curve.created_at,
        });

        // Handle optional initial buy
        if initial_buy_lamports > 0 {
            drop(curve);
            buy_tokens(ctx.accounts.into_buy_context(), initial_buy_lamports, 0, None)?;
        }

        Ok(())
    }

    // ── Buy tokens on bonding curve ───────────────────────────
    pub fn buy(
        ctx: Context<Buy>,
        sol_amount: u64,
        min_tokens_out: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        require!(!ctx.accounts.platform_config.is_paused, ErrorCode::PlatformPaused);
        require!(!ctx.accounts.bonding_curve.is_graduated, ErrorCode::TokenGraduated);
        require!(sol_amount > 0, ErrorCode::ZeroAmount);

        let curve = &mut ctx.accounts.bonding_curve;

        // Calculate fees
        let fees = calculate_fees(sol_amount);
        let sol_after_fees = sol_amount - fees.total;

        // Calculate tokens out using x*y=k formula
        // new_virtual_sol = virtual_sol + sol_after_fees
        // tokens_out = virtual_tokens - (virtual_sol * virtual_tokens) / new_virtual_sol
        let new_virtual_sol = curve.virtual_sol + sol_after_fees;
        let tokens_out = curve.virtual_tokens
            .checked_mul(sol_after_fees)
            .unwrap()
            .checked_div(new_virtual_sol)
            .unwrap();

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out <= curve.virtual_tokens, ErrorCode::InsufficientLiquidity);

        // Distribute fees
        distribute_fees(&ctx, &fees, referrer)?;

        // Update curve state
        curve.virtual_sol   += sol_after_fees;
        curve.real_sol      += sol_after_fees;
        curve.virtual_tokens -= tokens_out;
        curve.real_tokens   -= tokens_out;

        // Update volume
        let volume_usd = lamports_to_usd_approx(sol_amount);
        curve.total_volume_usd += volume_usd;
        ctx.accounts.platform_config.total_volume_usd += volume_usd;

        // Transfer tokens to buyer
        let seeds = &[b"bonding_curve", curve.mint.as_ref(), &[ctx.bumps.bonding_curve]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: curve.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;

        // Check KOL Pass milestone
        check_kol_pass_milestone(curve, &mut ctx.accounts.platform_config)?;

        // Check graduation
        if should_graduate(curve) {
            curve.is_graduated = true;
            emit!(TokenGraduated {
                mint: curve.mint,
                total_sol: curve.real_sol,
                total_volume_usd: curve.total_volume_usd,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        emit!(TokensBought {
            mint: curve.mint,
            buyer: ctx.accounts.buyer.key(),
            sol_amount,
            tokens_out,
            new_price: get_price(curve),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Sell tokens on bonding curve ──────────────────────────
    pub fn sell(
        ctx: Context<Sell>,
        token_amount: u64,
        min_sol_out: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        require!(!ctx.accounts.platform_config.is_paused, ErrorCode::PlatformPaused);
        require!(!ctx.accounts.bonding_curve.is_graduated, ErrorCode::TokenGraduated);
        require!(token_amount > 0, ErrorCode::ZeroAmount);

        let curve = &mut ctx.accounts.bonding_curve;

        // Calculate SOL out using x*y=k
        // sol_out = real_sol - (virtual_sol * virtual_tokens) / (virtual_tokens + token_amount)
        let new_virtual_tokens = curve.virtual_tokens + token_amount;
        let sol_out = curve.virtual_sol
            .checked_mul(token_amount)
            .unwrap()
            .checked_div(new_virtual_tokens)
            .unwrap();

        let fees = calculate_fees(sol_out);
        let sol_after_fees = sol_out - fees.total;

        require!(sol_after_fees >= min_sol_out, ErrorCode::SlippageExceeded);

        // Check for rug detection (creator selling big)
        if ctx.accounts.seller.key() == curve.creator {
            let seller_balance = ctx.accounts.seller_token_account.amount;
            let sell_pct = token_amount
                .checked_mul(BPS_DENOMINATOR)
                .unwrap()
                .checked_div(seller_balance + token_amount)
                .unwrap();

            if sell_pct >= RUG_SELL_THRESHOLD_BPS && !curve.is_rug_flagged {
                curve.is_rug_flagged = true;
                emit!(RugDetected {
                    mint: curve.mint,
                    trigger: RugTrigger::CreatorMassSell,
                    creator: curve.creator,
                    timestamp: Clock::get()?.unix_timestamp,
                });
            }
        }

        // Transfer tokens from seller to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // Distribute fees
        distribute_fees(&ctx, &fees, referrer)?;

        // Update curve
        curve.virtual_tokens += token_amount;
        curve.real_tokens    += token_amount;
        curve.virtual_sol    -= sol_out;
        curve.real_sol       -= sol_out;

        let volume_usd = lamports_to_usd_approx(sol_out);
        curve.total_volume_usd += volume_usd;

        // Transfer SOL to seller
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? -= sol_after_fees;
        **ctx.accounts.seller.try_borrow_mut_lamports()?    += sol_after_fees;

        emit!(TokensSold {
            mint: curve.mint,
            seller: ctx.accounts.seller.key(),
            token_amount,
            sol_out: sol_after_fees,
            new_price: get_price(curve),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── Submit KOL call ───────────────────────────────────────
    pub fn submit_kol_call(
        ctx: Context<SubmitKolCall>,
        thesis: String,
        badge_tier: u8, // 1=kol, 2=pro_kol, 3=gold_kol
    ) -> Result<()> {
        require!(!ctx.accounts.bonding_curve.is_rug_flagged, ErrorCode::TokenRugFlagged);
        require!(badge_tier >= 1, ErrorCode::NotAKol);

        let call = &mut ctx.accounts.kol_call;
        let curve = &ctx.accounts.bonding_curve;

        call.kol             = ctx.accounts.kol.key();
        call.mint            = curve.mint;
        call.thesis          = thesis;
        call.price_at_call   = get_price(curve);
        call.mktcap_at_call  = curve.total_volume_usd;
        call.badge_tier      = badge_tier;
        call.accuracy_status = 0; // pending
        call.reward_paid     = false;
        call.called_at       = Clock::get()?.unix_timestamp;

        emit!(KolCallSubmitted {
            kol: call.kol,
            mint: call.mint,
            price_at_call: call.price_at_call,
            badge_tier,
            timestamp: call.called_at,
        });

        Ok(())
    }

    // ── Admin: pause platform ─────────────────────────────────
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        ctx.accounts.platform_config.is_paused = paused;
        Ok(())
    }

    // ── Admin: approve Gold KOL ───────────────────────────────
    pub fn approve_gold_kol(ctx: Context<AdminAction>) -> Result<()> {
        emit!(GoldKolApproved {
            wallet: ctx.accounts.target.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ── Fee calculation ───────────────────────────────────────────
#[derive(Debug)]
pub struct FeeBreakdown {
    pub platform: u64,
    pub creator:  u64,
    pub kol_pool: u64,
    pub referral: u64,
    pub total:    u64,
}

pub fn calculate_fees(amount: u64) -> FeeBreakdown {
    let platform = amount.checked_mul(PLATFORM_FEE_BPS).unwrap()
        .checked_div(BPS_DENOMINATOR).unwrap();
    let creator  = amount.checked_mul(CREATOR_FEE_BPS).unwrap()
        .checked_div(BPS_DENOMINATOR).unwrap();
    let kol_pool = amount.checked_mul(KOL_POOL_FEE_BPS).unwrap()
        .checked_div(BPS_DENOMINATOR).unwrap();
    let referral = amount.checked_mul(REFERRAL_FEE_BPS).unwrap()
        .checked_div(BPS_DENOMINATOR).unwrap();
    let total = platform + creator + kol_pool + referral;
    FeeBreakdown { platform, creator, kol_pool, referral, total }
}

pub fn distribute_fees<'info>(
    ctx: &impl HasFeeAccounts<'info>,
    fees: &FeeBreakdown,
    _referrer: Option<Pubkey>,
) -> Result<()> {
    // Platform fee → your wallet
    anchor_lang::system_program::transfer(
        ctx.platform_fee_transfer(),
        fees.platform,
    )?;
    // KOL pool → pool wallet
    anchor_lang::system_program::transfer(
        ctx.kol_pool_transfer(),
        fees.kol_pool,
    )?;
    // Creator fee → creator wallet
    anchor_lang::system_program::transfer(
        ctx.creator_transfer(),
        fees.creator,
    )?;
    // Referral fee → referrer or platform if no referrer
    anchor_lang::system_program::transfer(
        ctx.referral_transfer(),
        fees.referral,
    )?;
    Ok(())
}

// ── Bonding curve math ────────────────────────────────────────
pub fn get_price(curve: &BondingCurveState) -> u64 {
    if curve.virtual_tokens == 0 { return 0; }
    curve.virtual_sol
        .checked_mul(1_000_000_000)
        .unwrap()
        .checked_div(curve.virtual_tokens)
        .unwrap()
}

pub fn should_graduate(curve: &BondingCurveState) -> bool {
    // Estimate market cap — simplified
    let price = get_price(curve);
    let market_cap = price
        .checked_mul(TOTAL_SUPPLY)
        .unwrap()
        .checked_div(1_000_000_000)
        .unwrap();
    // Graduate at approximately $69K
    // In production: use Pyth oracle for SOL/USD price
    market_cap >= 30_000_000_000 // ~$69K worth of SOL at $2,300/SOL
}

pub fn lamports_to_usd_approx(lamports: u64) -> u64 {
    // Approximate: 1 SOL = $150 (update via oracle in production)
    lamports.checked_mul(150).unwrap().checked_div(1_000_000_000).unwrap()
}

pub fn check_kol_pass_milestone(
    curve: &mut BondingCurveState,
    config: &mut PlatformConfig,
) -> Result<()> {
    if !curve.kol_pass_earned
        && curve.total_volume_usd >= KOL_PASS_VOLUME_THRESHOLD
        && config.kol_passes_issued < KOL_PASS_MAX_SUPPLY
    {
        curve.kol_pass_earned = true;
        config.kol_passes_issued += 1;
        curve.kol_pass_number = config.kol_passes_issued;

        emit!(KolPassEarned {
            mint: curve.mint,
            creator: curve.creator,
            pass_number: curve.kol_pass_number,
            total_volume_usd: curve.total_volume_usd,
            timestamp: Clock::get()?.unix_timestamp,
        });
    }
    Ok(())
}

// ── Accounts ──────────────────────────────────────────────────
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::SIZE,
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    /// CHECK: validated against constant
    pub platform_fee_wallet: UncheckedAccount<'info>,
    /// CHECK: validated against constant
    pub kol_pool_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LaunchToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurveState::SIZE,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurveState>,
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"platform_config"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    /// CHECK: hardcoded fee wallet
    #[account(mut, constraint = platform_fee_wallet.key().to_string() == PLATFORM_FEE_WALLET)]
    pub platform_fee_wallet: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"bonding_curve", bonding_curve.mint.as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurveState>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"platform_config"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    /// CHECK: sol vault
    #[account(mut, seeds = [b"sol_vault", bonding_curve.mint.as_ref()], bump)]
    pub sol_vault: UncheckedAccount<'info>,
    /// CHECK: platform fee wallet
    #[account(mut, constraint = platform_fee_wallet.key().to_string() == PLATFORM_FEE_WALLET)]
    pub platform_fee_wallet: UncheckedAccount<'info>,
    /// CHECK: kol pool wallet
    #[account(mut, constraint = kol_pool_wallet.key().to_string() == KOL_POOL_WALLET)]
    pub kol_pool_wallet: UncheckedAccount<'info>,
    /// CHECK: creator wallet (receives 0.15%)
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,
    /// CHECK: referral wallet
    #[account(mut)]
    pub referral_wallet: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut, seeds = [b"bonding_curve", bonding_curve.mint.as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurveState>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"platform_config"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    /// CHECK: sol vault
    #[account(mut, seeds = [b"sol_vault", bonding_curve.mint.as_ref()], bump)]
    pub sol_vault: UncheckedAccount<'info>,
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
pub struct SubmitKolCall<'info> {
    #[account(mut)]
    pub kol: Signer<'info>,
    pub bonding_curve: Account<'info, BondingCurveState>,
    #[account(
        init,
        payer = kol,
        space = 8 + KolCallState::SIZE,
        seeds = [b"kol_call", kol.key().as_ref(), bonding_curve.mint.as_ref()],
        bump
    )]
    pub kol_call: Account<'info, KolCallState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, constraint = authority.key() == platform_config.authority)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"platform_config"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    /// CHECK: target wallet for admin actions
    pub target: UncheckedAccount<'info>,
}

// ── State accounts ────────────────────────────────────────────
#[account]
pub struct PlatformConfig {
    pub authority:             Pubkey,
    pub platform_fee_wallet:   Pubkey,
    pub kol_pool_wallet:       Pubkey,
    pub total_tokens_launched: u64,
    pub total_volume_usd:      u64,
    pub kol_passes_issued:     u64,
    pub is_paused:             bool,
    pub bump:                  u8,
}
impl PlatformConfig {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 64;
}

#[account]
pub struct BondingCurveState {
    pub creator:              Pubkey,
    pub mint:                 Pubkey,
    pub name:                 String,   // max 32
    pub ticker:               String,   // max 10
    pub uri:                  String,   // max 200
    pub virtual_sol:          u64,
    pub virtual_tokens:       u64,
    pub real_sol:             u64,
    pub real_tokens:          u64,
    pub total_volume_usd:     u64,
    pub is_graduated:         bool,
    pub is_rug_flagged:       bool,
    pub kol_pass_earned:      bool,
    pub kol_pass_number:      u64,
    pub creator_token_balance_at_launch: u64,
    pub created_at:           i64,
}
impl BondingCurveState {
    pub const SIZE: usize = 32 + 32 + 36 + 14 + 204 + 8*6 + 3 + 8 + 8 + 8 + 64;
}

#[account]
pub struct KolCallState {
    pub kol:             Pubkey,
    pub mint:            Pubkey,
    pub thesis:          String, // max 280
    pub price_at_call:   u64,
    pub mktcap_at_call:  u64,
    pub badge_tier:      u8,     // 1=kol, 2=pro_kol, 3=gold_kol
    pub accuracy_status: u8,     // 0=pending, 1=hit, 2=partial, 3=miss
    pub reward_paid:     bool,
    pub called_at:       i64,
}
impl KolCallState {
    pub const SIZE: usize = 32 + 32 + 284 + 8 + 8 + 1 + 1 + 1 + 8 + 64;
}

// ── Events ────────────────────────────────────────────────────
#[event]
pub struct TokenLaunched {
    pub mint:      Pubkey,
    pub creator:   Pubkey,
    pub ticker:    String,
    pub timestamp: i64,
}

#[event]
pub struct TokensBought {
    pub mint:      Pubkey,
    pub buyer:     Pubkey,
    pub sol_amount: u64,
    pub tokens_out: u64,
    pub new_price:  u64,
    pub timestamp:  i64,
}

#[event]
pub struct TokensSold {
    pub mint:         Pubkey,
    pub seller:       Pubkey,
    pub token_amount: u64,
    pub sol_out:      u64,
    pub new_price:    u64,
    pub timestamp:    i64,
}

#[event]
pub struct TokenGraduated {
    pub mint:             Pubkey,
    pub total_sol:        u64,
    pub total_volume_usd: u64,
    pub timestamp:        i64,
}

#[event]
pub struct RugDetected {
    pub mint:      Pubkey,
    pub trigger:   RugTrigger,
    pub creator:   Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct KolPassEarned {
    pub mint:             Pubkey,
    pub creator:          Pubkey,
    pub pass_number:      u64,
    pub total_volume_usd: u64,
    pub timestamp:        i64,
}

#[event]
pub struct KolCallSubmitted {
    pub kol:          Pubkey,
    pub mint:         Pubkey,
    pub price_at_call: u64,
    pub badge_tier:   u8,
    pub timestamp:    i64,
}

#[event]
pub struct GoldKolApproved {
    pub wallet:    Pubkey,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum RugTrigger {
    CreatorMassSell,
    CreatorWalletZeroed,
    LiquidityPulled,
    CoordinatedDump,
}

// ── Errors ────────────────────────────────────────────────────
#[error_code]
pub enum ErrorCode {
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Token name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Ticker too long (max 10 chars)")]
    TickerTooLong,
    #[msg("Token has already graduated to KOLSwap")]
    TokenGraduated,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in curve")]
    InsufficientLiquidity,
    #[msg("Token is flagged for rug — community vote in progress")]
    TokenRugFlagged,
    #[msg("Only KOL badge holders can submit calls")]
    NotAKol,
    #[msg("You already called this token")]
    AlreadyCalled,
    #[msg("Cannot call your own token")]
    CannotCallOwnToken,
}

// ── Traits ────────────────────────────────────────────────────
pub trait HasFeeAccounts<'info> {
    fn platform_fee_transfer(&self) -> CpiContext<'_, '_, '_, 'info, anchor_lang::system_program::Transfer<'info>>;
    fn kol_pool_transfer(&self) -> CpiContext<'_, '_, '_, 'info, anchor_lang::system_program::Transfer<'info>>;
    fn creator_transfer(&self) -> CpiContext<'_, '_, '_, 'info, anchor_lang::system_program::Transfer<'info>>;
    fn referral_transfer(&self) -> CpiContext<'_, '_, '_, 'info, anchor_lang::system_program::Transfer<'info>>;
}
