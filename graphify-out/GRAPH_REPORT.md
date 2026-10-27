# Graph Report - src  (2026-10-24)

## Corpus Check
- Large corpus: 609 files · ~452,574 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3278 nodes · 8875 edges · 156 communities (134 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Admin Blacklist e Bônus
- Prisma e Simulador Admin
- UI Admin Mineradoras/Pacotes
- APIs Diversas de Carreira/Ativação
- Admin Logs e Divisão de Lucro
- APIs Admin de Pacotes/Promoções
- Admin Saques, Saldos e Relatórios
- Stripe e Conversão de Moeda
- Lógica Unilevel e Lucros
- Tipos de Transação e Saldos
- API de Blacklist
- Lógica de Negócio e Ciclos
- Pedidos e Pagamentos com Bônus
- Papéis e Permissões
- Cliente API Pagar.me
- Transferências PIX Bradesco
- Landing Page v2
- Admin Detalhe de Usuário
- Validações da Loja
- Tipos Pagar.me
- Serviço Financeiro e Auth
- AdminLayout e Ícones
- Componentes da Landing
- Chaves de Parâmetros
- Reset Senha Financeira por SMS
- Reset de Senha por SMS
- Home e Animações
- AdminLayout2 e Dashboard
- Limites de Compra e Saques
- Verificação de Telefone
- Auth e PIX Bradesco
- UI Papéis e Permissões
- Cliente API OpenPix
- Tipos OpenPix
- Admin Banco Bradesco
- Extrato Bradesco
- Respostas OpenPix
- Hook de Permissões e Produtos
- Cobrança Pagar.me
- Middleware de Autorização
- Teto de Bônus Direto
- Serviço de SMS
- Endereço Internacional
- Perfil e Chave PIX
- Upgrade de Pacote
- Migração Unilevel e Clube300
- APIs Admin de Parâmetros/Saques
- Firebase e Cobrança OpenPix
- Modelo da Loja
- Payouts Stripe
- Cron Jobs
- Certificados Bradesco mTLS
- Tipos de Suporte
- Cadastro e Pacote Ativo
- Cashback Clube300
- Spillover da Árvore
- Serviço MLM da Loja
- Webhook Pagar.me
- Troca de Senhas
- Promoções e Processamento de Pacote
- Exemplos OpenPix
- Chat de Suporte
- Admin Transações
- API de Mineradoras
- API de Permissões
- Cálculo de Pontos
- Frete Melhor Envio
- Esqueci a Senha
- Página de Cadastro
- Diretos e Minha Equipe
- Visão da Rede Unilevel
- Logger do Sistema
- Cliente SMS Dev
- Listas de Suporte
- Serviço de Parâmetros
- Dashboard do Usuário
- Email Reset Senha Financeira
- Email Reset de Senha
- Status de Recebedor
- Stripe Connect
- Simulador de Compra
- Email de Confirmação
- Modais de Pagamento Stripe
- Validações de Suporte
- Dashboard Financeiro Admin
- Painel Admin e Recálculo
- Parcelamento Pagar.me
- Webhook Stripe
- Esqueci Senha Financeira
- Cotas e Planos
- Graduados e Flyer
- Vitrine da Loja
- Tipos Next-Auth e Pedido
- Admin Graduados e Pontos
- Árvore Unilevel
- Webhook OpenPix
- Admin Clube 300
- Rede Inicial
- Rede Antiga (cópia)
- Recursos da Blacklist
- Contratos e Compra de Pacote
- Cotações
- Página de Carreira
- Integração Pagar.me Pacotes
- Webhook Stripe Payouts
- Layout Raiz
- HTTP Bradesco
- Rastreio de Bônus Direto
- Posicionamento por Lado
- Carrinho e Layout Dashboard
- Guarda de Blacklist
- Página Simulador
- API do Carrinho
- Serviço de Email
- Utilitários de Rede HTTP
- Status do Pedido
- Tipos de Promoção
- API de Diretos
- Reset Senha Financeira UI
- Editar Perfil
- Input de Telefone
- Navbar e Logo
- Eventos OpenPix
- Estatísticas Admin
- API Categorias Admin
- API Produtos Admin
- API Chave PIX
- Página de Login
- Página Reset de Senha
- Métodos de Pagamento
- Status de Pagamento
- Breakpoints
- Tipos de Chave PIX
- API de Parâmetros
- Criação de Conta Bancária
- Tokenização de Cartão
- API de Downlines
- Teste de Mesa
- Área de Transferência
- Processador de Chave PIX
- Logs de Auditoria
- API Pedido do Usuário
- Confirmação de Email
- Reenvio de Confirmação
- Card Animado
- Card com Gradiente
- Nó da Rede Unilevel
- Envio Reset Senha Financeira
- Envio Reset de Senha
- Envio de Confirmação
- Hook de Acesso Bloqueado
- Serialização BigInt
- Info de Spillover
- Schema de Produto
- Modelo Flyer

## God Nodes (most connected - your core abstractions)
1. `prisma` - 236 edges
2. `getAuthenticatedUser()` - 151 edges
3. `hasPermission()` - 115 edges
4. `authOptions` - 101 edges
5. `useAuth()` - 88 edges
6. `Button()` - 84 edges
7. `formatCurrency()` - 59 edges
8. `Card()` - 51 edges
9. `pagarMeAPI` - 50 edges
10. `CardContent()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `BonusPage()` --calls--> `formatCurrency()`  [EXTRACTED]
  app/admin/bonus/page.tsx → lib/utils.ts
- `GET()` --calls--> `getUserBalance()`  [EXTRACTED]
  app/api/store/payments/bonus-payment/route.ts → lib/business-logic.ts
- `RedePage()` --calls--> `useAuth()`  [EXTRACTED]
  app/dashboard/rede copy/page.tsx → lib/hooks/useAuth.ts
- `getResourceLabel()` --calls--> `getFlatBlacklistOptions()`  [EXTRACTED]
  app/admin/blacklist/page.tsx → lib/constants/blacklist-resources.ts
- `BlacklistPage()` --calls--> `BlacklistModal()`  [EXTRACTED]
  app/admin/blacklist/page.tsx → components/modals/BlacklistModal.tsx

## Import Cycles
- None detected.

## Communities (156 total, 22 thin omitted)

### Community 0 - "Admin Blacklist e Bônus"
Cohesion: 0.04
Nodes (79): BlacklistEntry, BlacklistGroupedByUser, BlacklistPage(), getResourceLabel(), Pagination, BONUS_TYPES, BonusData, BonusPage() (+71 more)

### Community 1 - "Prisma e Simulador Admin"
Cohesion: 0.03
Nodes (10): GET(), querySchema, querySchema, dynamic, getAllUserActivePackages(), EmailService, globalForPrisma, prisma (+2 more)

### Community 2 - "UI Admin Mineradoras/Pacotes"
Cohesion: 0.07
Nodes (86): AdminMineradorasPage(), DEFAULT_FORM, AdminPacotesPage(), DEFAULT_FORM, MinerOption, Package, AdminPromocaoCuponsPage(), Coupon (+78 more)

### Community 3 - "APIs Diversas de Carreira/Ativação"
Cohesion: 0.04
Nodes (16): updateOrderSchema, handler, dynamic, DirectsRequirementResult, LegRequirementResult, redeemPrizeSchema, checkoutSchema, calculateSchema (+8 more)

### Community 4 - "Admin Logs e Divisão de Lucro"
Cohesion: 0.07
Nodes (75): DivisaoLucroPage(), MinerOption, categoryColors, levelColors, LogResponse, LogStats, SystemLog, SystemLogsPage() (+67 more)

### Community 5 - "APIs Admin de Pacotes/Promoções"
Cohesion: 0.06
Nodes (47): GET(), GET(), GET(), querySchema, GET(), GET(), GET(), GET() (+39 more)

### Community 6 - "Admin Saques, Saldos e Relatórios"
Cohesion: 0.05
Nodes (48): RelatoriosPage(), ReportData, BalanceResponse, dynamic, SaldosPage(), UserBalance, ConfirmModal(), ConfirmModalProps (+40 more)

### Community 7 - "Stripe e Conversão de Moeda"
Cohesion: 0.07
Nodes (47): GET(), GET(), GET(), POST(), clearExchangeRatesCache(), convertCurrency(), FALLBACK_RATES, fetchExchangeRates() (+39 more)

### Community 8 - "Lógica Unilevel e Lucros"
Cohesion: 0.07
Nodes (39): GET(), POST(), POST(), POST(), CareerLevelCache, checkCareerProgression(), checkCareerProgressionForUpline(), creditUnilevelBonus() (+31 more)

### Community 9 - "Tipos de Transação e Saldos"
Cohesion: 0.06
Nodes (22): dynamic, prisma, prisma, dynamic, autoActivationSchema, prisma, ALL_TRANSACTION_TYPES, BINARY_BONUS_TYPES (+14 more)

### Community 10 - "API de Blacklist"
Cohesion: 0.07
Nodes (38): DELETE(), GET(), PUT(), GET(), POST(), GET(), GET(), GET() (+30 more)

### Community 11 - "Lógica de Negócio e Ciclos"
Cohesion: 0.08
Nodes (37): POST(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+29 more)

### Community 12 - "Pedidos e Pagamentos com Bônus"
Cohesion: 0.08
Nodes (25): updateOrderSchema, bonusPaymentSchema, GET(), POST(), categorySchema, categorySchema, createCheckoutSessionSchema, createPaymentIntentSchema (+17 more)

### Community 13 - "Papéis e Permissões"
Cohesion: 0.09
Nodes (37): DELETE(), GET(), POST(), DELETE(), GET(), PUT(), DELETE(), GET() (+29 more)

### Community 15 - "Transferências PIX Bradesco"
Cohesion: 0.11
Nodes (35): mapPixKeyType(), POST(), BANK_CODE_TO_ISPB, buildWithdrawalDescriptionAfterPixSent(), mapAccountType(), mapPixKeyType(), POST(), transferBodySchema (+27 more)

### Community 16 - "Landing Page v2"
Cohesion: 0.14
Nodes (25): LandingV2(), LandingV2Content(), AboutCompany(), CtaSection(), CtaSectionProps, FooterV2(), FooterV2Props, HeroSectionV2() (+17 more)

### Community 17 - "Admin Detalhe de Usuário"
Cohesion: 0.08
Nodes (33): Activation, Bonus, CareerBenefits, CareerInfo, Contract, FinancialTransaction, NetworkInfo, PixKey (+25 more)

### Community 18 - "Validações da Loja"
Cohesion: 0.05
Nodes (35): addToWishlistSchema, AddTrackingCodeInput, addTrackingCodeSchema, CalculateShippingInput, calculateShippingSchema, CategoryListQuery, categoryListQuerySchema, CreateCategoryInput (+27 more)

### Community 19 - "Tipos Pagar.me"
Cohesion: 0.06
Nodes (31): AddItemRequest, Antifraud, BankAccount, Charge, CreateBoletoPaymentOptions, CreateCardTokenOptions, CreateCreditCardPaymentOptions, CreatePixPaymentOptions (+23 more)

### Community 20 - "Serviço Financeiro e Auth"
Cohesion: 0.10
Nodes (17): POST(), GET(), DELETE(), PUT(), GET(), POST(), transactionSchema, FinancialService (+9 more)

### Community 21 - "AdminLayout e Ícones"
Cohesion: 0.06
Nodes (5): DashboardLayoutProps, iconComponents, menuCategories, MenuCategory, MenuItem

### Community 22 - "Componentes da Landing"
Cohesion: 0.09
Nodes (28): PartnerSection(), FeatureCard(), FeatureCardProps, LifestyleCard(), LifestyleCardProps, StatCard(), StatCardProps, WhyCopperSection() (+20 more)

### Community 23 - "Chaves de Parâmetros"
Cohesion: 0.06
Nodes (36): ParameterKeys, ACTIVATION_BONUS_CONVERSION_PERCENT, ACTIVATION_DURATION_DAYS, ACTIVATION_ENABLED, ACTIVATION_PIX_AMOUNT, BONUS_CYCLE_ENABLED, BOOTED_BONUS, COMMISSION_LEVELS_CONFIG (+28 more)

### Community 24 - "Reset Senha Financeira por SMS"
Cohesion: 0.12
Nodes (29): getValidationError(), POST(), getValidationError(), POST(), getValidationError(), POST(), buildFullPhoneNumber(), findUserByDocumentAndPhone() (+21 more)

### Community 25 - "Reset de Senha por SMS"
Cohesion: 0.12
Nodes (29): getValidationError(), POST(), getValidationError(), POST(), getValidationError(), POST(), buildFullPhoneNumber(), findUserByDocumentAndPhone() (+21 more)

### Community 26 - "Home e Animações"
Cohesion: 0.15
Nodes (23): Home(), HomeContent(), landingContent, AboutSection(), CopperMiningSection(), FooterLinkProps, FooterSection(), FooterSectionProps (+15 more)

### Community 27 - "AdminLayout2 e Dashboard"
Cohesion: 0.09
Nodes (13): AdminLayout2(), AdminLayoutProps, iconComponents, MenuItem, menuItems, DashboardLayoutProps, MenuItem, menuItems (+5 more)

### Community 28 - "Limites de Compra e Saques"
Cohesion: 0.09
Nodes (14): DownlineResult, FixResult, FixSource, GET(), isValidTimezone(), withdrawalSchema, ParameterValue, getUserCurrentPurchaseTotal() (+6 more)

### Community 29 - "Verificação de Telefone"
Cohesion: 0.13
Nodes (23): getValidationError(), POST(), getValidationError(), POST(), buildFullPhoneNumber(), ensureRegisterPhoneVerified(), generateSmsCode(), generateVerificationToken() (+15 more)

### Community 30 - "Auth e PIX Bradesco"
Cohesion: 0.13
Nodes (25): GET(), getBradescoAccessToken(), getCacheKey(), getContasCacheKey(), getContasOAuthScope(), invalidateBradescoContasTokenCache(), invalidateBradescoTokenCache(), TokenCache (+17 more)

### Community 31 - "UI Papéis e Permissões"
Cohesion: 0.10
Nodes (22): RolesPermissionsPage(), TabType, AuditFilters, AuditRecord, AuditTab(), CreateRoleModal(), EditRoleModal(), EditRoleModalProps (+14 more)

### Community 33 - "Tipos OpenPix"
Cohesion: 0.07
Nodes (28): AddressData, CampaignData, ChargeWebhookData, CustomerData, EcommerceIntegration, ListChargesFilter, ListTransactionsFilter, MovementWebhookData (+20 more)

### Community 34 - "Admin Banco Bradesco"
Cohesion: 0.12
Nodes (25): AdminBancoBradescoPage(), classifyMovimentoExtrato(), defaultExtratoRange(), ExtratoApi, flattenListaLancamentos(), LancamentoTabela, MovimentoExtrato, rowClassMovimento() (+17 more)

### Community 35 - "Extrato Bradesco"
Cohesion: 0.17
Nodes (23): CalDate, calDateToBradescoParam(), compareCalDate(), dataQuery, GET(), parseQueryDate(), querySchema, getBradescoAgent() (+15 more)

### Community 36 - "Respostas OpenPix"
Cohesion: 0.07
Nodes (21): AccountResponse, BalanceResponse, ChargeResponse, CreateAccountRequest, createOpenPixCharge(), CreatePaymentRequest, createPixCharge(), CreatePixChargeOptions (+13 more)

### Community 37 - "Hook de Permissões e Produtos"
Cohesion: 0.11
Nodes (22): Category, EditarProdutoPage(), Product, Promotion, Category, NovoProdutoPage(), Promotion, RoleGate() (+14 more)

### Community 38 - "Cobrança Pagar.me"
Cohesion: 0.12
Nodes (21): POST(), POST(), billingAddressSchema, cardDataSchema, chargeCardSchema, POST(), CreateChargeBody, POST() (+13 more)

### Community 39 - "Middleware de Autorização"
Cohesion: 0.15
Nodes (19): POST(), GET(), getUserPermissions(), getUserPermissionsInternal(), getUserRoles(), hasAllPermissions(), hasAnyPermission(), hasAnyRole() (+11 more)

### Community 40 - "Teto de Bônus Direto"
Cohesion: 0.16
Nodes (24): POST(), computeDirectBonusAllowed(), computeActivePackagesDirectBonusCeiling(), computeAllowedDirectBonusForSponsorRelationship(), computeDirectBonusFromPurchases(), computeExpectedDirectBonusFromPurchases(), computeExpectedDirectBonusInSponsorPeriod(), computeGlobalExpectedDirectBonus() (+16 more)

### Community 41 - "Serviço de SMS"
Cohesion: 0.14
Nodes (17): GET(), getValidationError(), POST(), getValidationError(), POST(), GET(), getValidationError(), CancelSmsInput (+9 more)

### Community 42 - "Endereço Internacional"
Cohesion: 0.15
Nodes (22): POST(), AddressForm(), AddressFormProps, DocumentTypeInfo, formatCPF(), formatDocument(), formatGenericWithDots(), formatPostalCode() (+14 more)

### Community 43 - "Perfil e Chave PIX"
Cohesion: 0.12
Nodes (18): BankAccount, PixKey, ProfilePage(), ChangePasswordFormData, ChangePasswordModal(), ChangePasswordModalProps, changePasswordSchema, EditProfileModal() (+10 more)

### Community 44 - "Upgrade de Pacote"
Cohesion: 0.17
Nodes (22): buildMinerIdWhere(), buildPackageMinerGroupKey(), calculatePackageTotals(), calculateUpgrade(), findNextPackage(), findPackageById(), groupPackagesByTypeAndMiner(), matchesMinerId() (+14 more)

### Community 45 - "Migração Unilevel e Clube300"
Cohesion: 0.12
Nodes (12): AddEligibleUsersResult, EligibleUser, GET(), getAuthUser(), POST(), migrationSchema, generatePointsSchema, DELETE() (+4 more)

### Community 46 - "APIs Admin de Parâmetros/Saques"
Cohesion: 0.13
Nodes (16): DELETE(), PUT(), updateParameterSchema, validateParameterValue(), PATCH(), PATCH(), updatePackageMinerSchema, GET() (+8 more)

### Community 47 - "Firebase e Cobrança OpenPix"
Cohesion: 0.14
Nodes (15): CreateChargeBody, POST(), validarDadosCobranca(), POST(), app, deleteFile(), firebaseConfig, generateUniqueFileName() (+7 more)

### Community 48 - "Modelo da Loja"
Cohesion: 0.09
Nodes (21): CategoryListResponse, CouponValidation, OrderFilters, OrderListResponse, OrderSummary, ProductListResponse, ShippingOption, StoreCategory (+13 more)

### Community 49 - "Payouts Stripe"
Cohesion: 0.14
Nodes (14): GET(), POST(), GET(), POST(), processStripeWithdrawalSchema, BankAccountInfo, createStripePayout(), getStripeBalance() (+6 more)

### Community 50 - "Cron Jobs"
Cohesion: 0.26
Nodes (19): GET(), POST(), expireOldActivations(), processAutoActivation(), processMonthlyProfitDistribution(), cleanupCareerQueue(), processCareerQueue(), executeCronJob() (+11 more)

### Community 51 - "Certificados Bradesco mTLS"
Cohesion: 0.17
Nodes (16): BradescoEnvironment, BradescoRuntimeMtlsPaths, createPathFromBase64Env(), decodeBase64File(), getRuntimeBradescoMtlsPaths(), persistTempFile(), runtimePathCache, BradescoEnvironmentConfig (+8 more)

### Community 52 - "Tipos de Suporte"
Cohesion: 0.12
Nodes (20): SupportTicketStatus, AddMessageRequest, AddMessageResponse, CreateSupportTicketRequest, CreateSupportTicketResponse, NewSupportTicketModalProps, PaginatedSupportTickets, SupportChatMessagesProps (+12 more)

### Community 53 - "Cadastro e Pacote Ativo"
Cohesion: 0.17
Nodes (18): POST(), POST(), GET(), getUserLastActivePackage(), createOrUpdateUnilevelUser(), getUserActivePackage(), validatePhone(), clearRegisterPhoneVerification() (+10 more)

### Community 54 - "Cashback Clube300"
Cohesion: 0.23
Nodes (17): GET(), GET(), POST(), calculateDailyCashback(), getBusinessDaysInMonth(), getCurrentMonthBusinessDays(), getEasterDate(), isBrazilianHoliday() (+9 more)

### Community 55 - "Spillover da Árvore"
Cohesion: 0.15
Nodes (16): GET(), GET(), Tree, calculateUserPoints(), findBalancedSpilloverPosition(), findBestSpilloverPosition(), findPreferredSideRecursivePosition(), getNetworkStats() (+8 more)

### Community 56 - "Serviço MLM da Loja"
Cohesion: 0.15
Nodes (11): bonusPaymentStoreSchema, checkBalanceSchema, GET(), POST(), ParsedChargeCardBody, processStoreOrderCouponGeneration(), StoreOrderCouponResult, checkCanReceiveBonusLevel() (+3 more)

### Community 57 - "Webhook Pagar.me"
Cohesion: 0.19
Nodes (14): POST(), processPaymentCancellation(), processPixPayment(), processRecipientEvent(), processTransferEvent(), processUsageEvent(), verifyWebhookSignature(), createPackagePaymentData() (+6 more)

### Community 58 - "Troca de Senhas"
Cohesion: 0.11
Nodes (6): changePasswordSchema, createFinancialPasswordSchema, resetFinancialPasswordSchema, updateFinancialPasswordSchema, verifyFinancialPasswordSchema, updateProfileSchema

### Community 59 - "Promoções e Processamento de Pacote"
Cohesion: 0.20
Nodes (16): GET(), checkAndAddToClube300(), checkAndCreateCouponForPackage(), PackagePaymentData, PackagePaymentResult, processPackagePayment(), applyUpgradeResult(), getAllSystemPackages() (+8 more)

### Community 60 - "Exemplos OpenPix"
Cohesion: 0.17
Nodes (16): exemploBuscarCobranca(), exemploConsultarSaldo(), exemploCriarChavePixAleatoria(), exemploCriarChavePixEmail(), exemploCriarCobrancaCompleta(), exemploCriarCobrancaSimples(), exemploCriarWebhook(), exemploFluxoCompletoPagamento() (+8 more)

### Community 61 - "Chat de Suporte"
Cohesion: 0.18
Nodes (13): AdminSupportTicketDetailPage(), SupportTicketDetailPage(), SupportTicketDetails, SupportTicketImage, SupportTicketMessage, SupportChatMessages(), SupportChatMessagesProps, SupportTicketMessage (+5 more)

### Community 62 - "Admin Transações"
Cohesion: 0.13
Nodes (14): getTransactionTypeColor(), statusColors, TransactionDetails, TransactionDetailsPage(), transactionStatusLabels, transactionTypeLabels, Pagination, statusColors (+6 more)

### Community 63 - "API de Mineradoras"
Cohesion: 0.17
Nodes (15): DELETE(), GET(), Params, PUT(), GET(), POST(), CreateMinerInput, createMinerSchema (+7 more)

### Community 64 - "API de Permissões"
Cohesion: 0.14
Nodes (14): GET(), GET(), DELETE(), GET(), AuditFiltersInput, auditFiltersSchema, DeleteUserPermissionInput, deleteUserPermissionSchema (+6 more)

### Community 65 - "Cálculo de Pontos"
Cohesion: 0.21
Nodes (10): POST(), generatePackageSchema, POST(), createUserPackage(), calculateNetworkPoints(), calculateOwnPoints(), markUplineForRecalc(), processRecalcQueue() (+2 more)

### Community 66 - "Frete Melhor Envio"
Cohesion: 0.22
Nodes (14): POST(), calcularFrete(), MELHOR_ENVIO_CALCULATE_ENDPOINT, MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_URL, getBaseUrl(), getToken(), MelhorEnvioAddress (+6 more)

### Community 67 - "Esqueci a Senha"
Cohesion: 0.21
Nodes (14): Page(), AdicionarEnderecoPage(), ForgotPasswordPage(), getDesktopDescription(), getMaskedPhone(), normalizeDocumentValue(), PhoneRecoveryStep, RecoveryMethod (+6 more)

### Community 68 - "Página de Cadastro"
Cohesion: 0.20
Nodes (15): BackgroundLayer(), getMaskedPhone(), getPhoneSignature(), InputField(), InputFieldProps, PrimaryButton(), ProgressIndicator(), RegisterForm() (+7 more)

### Community 69 - "Diretos e Minha Equipe"
Cohesion: 0.14
Nodes (15): DirectReferral, DirectsResponse, DiretosPage(), GRADUATION_PIN_FALLBACK, SORT_COLUMNS, SortColumn, SortDirection, Downline (+7 more)

### Community 70 - "Visão da Rede Unilevel"
Cohesion: 0.15
Nodes (15): BreadcrumbItem, RedePage(), UnilevelNetworkData, UnilevelNetworkStats, UnilevelNodeData, TreeNode(), TreeNodeProps, UnilevelListView() (+7 more)

### Community 72 - "Cliente SMS Dev"
Cohesion: 0.24
Nodes (7): SmsDevService, SmsDevApiResponseItem, SmsDevBalanceResponse, SmsDevCancelRequest, SmsDevConfig, SmsDevSendMessage, SmsDevStatusRequest

### Community 73 - "Listas de Suporte"
Cohesion: 0.20
Nodes (12): AdminSupportPage(), PaginatedResponse, SupportTicketListItem, PaginatedResponse, SupportPage(), SupportTicketListItem, NewSupportTicketModal(), NewSupportTicketModalProps (+4 more)

### Community 75 - "Dashboard do Usuário"
Cohesion: 0.18
Nodes (12): ActivePackage, CurrentCareer, DashboardPage(), getReferralCode(), UserCoupon, Clube300Card(), Clube300CardProps, InactiveUserAlert() (+4 more)

### Community 76 - "Email Reset Senha Financeira"
Cohesion: 0.12
Nodes (15): button, container, content, FinancialPasswordResetProps, footer, footerText, greeting, h1 (+7 more)

### Community 77 - "Email Reset de Senha"
Cohesion: 0.12
Nodes (15): button, container, content, footer, footerText, greeting, h1, header (+7 more)

### Community 78 - "Status de Recebedor"
Cohesion: 0.22
Nodes (13): KycData, RecipientStatusBadge(), RecipientStatusBadgeProps, RecipientStatusBadgeSimple(), useIsMobile(), canTransact(), canWithdraw(), getRecipientStatusClasses() (+5 more)

### Community 79 - "Stripe Connect"
Cohesion: 0.14
Nodes (9): CreateStripeConnectAccountRequest, CreateStripeConnectAccountResponse, createStripeTransfer(), finalizeWithdrawal(), logStripeTransfer(), stripe, StripeLogData, StripeTransferRequest (+1 more)

### Community 80 - "Simulador de Compra"
Cohesion: 0.23
Nodes (12): analyzeImpact(), captureFinalState(), captureInitialState(), POST(), GET(), GET(), POST(), getUserActivePackages() (+4 more)

### Community 81 - "Email de Confirmação"
Cohesion: 0.13
Nodes (14): button, container, content, EmailConfirmationProps, footer, footerText, greeting, h1 (+6 more)

### Community 82 - "Modais de Pagamento Stripe"
Cohesion: 0.20
Nodes (10): StripePaymentModalProps, PixForm(), PixFormProps, StripePixPaymentModal(), StripePixPaymentModalProps, isStripeConfigured, STRIPE_ELEMENTS_OPTIONS, STRIPE_PUBLISHABLE_KEY (+2 more)

### Community 83 - "Validações de Suporte"
Cohesion: 0.13
Nodes (14): AddMessageInput, addMessageSchema, CreateTicketInput, createTicketSchema, ListTicketsInput, PaginatedResponse, SupportTicketImage, SupportTicketListItem (+6 more)

### Community 84 - "Dashboard Financeiro Admin"
Cohesion: 0.24
Nodes (11): FinancialDashboard(), MinerOption, translateCategory(), FinancialChart(), FinancialChartData, FinancialChartProps, FinancialTransactionForm(), FinancialTransactionFormProps (+3 more)

### Community 85 - "Painel Admin e Recálculo"
Cohesion: 0.21
Nodes (11): AdminDashboard(), AdminStats, RecentActivity, FilaRecalculoPage(), formatDateTime(), formatNumber(), QueueUser, RecalcQueueResponse (+3 more)

### Community 86 - "Parcelamento Pagar.me"
Cohesion: 0.35
Nodes (12): calculateInstallmentsSchema, formatCurrency(), GET(), calculateInstallmentAmount(), calculateTotalWithInterest(), formatInstallmentLabel(), generateInstallmentOptions(), getInterestRate() (+4 more)

### Community 87 - "Webhook Stripe"
Cohesion: 0.30
Nodes (12): POST(), processAsyncPaymentFailed(), processAsyncPaymentSucceeded(), processCheckoutSessionCompleted(), processCheckoutSessionExpired(), processPaymentFailed(), processPaymentIntentCreated(), processPaymentIntentRequiresAction() (+4 more)

### Community 88 - "Esqueci Senha Financeira"
Cohesion: 0.24
Nodes (11): metadata, Page(), ForgotFinancialPasswordPage(), getDesktopDescription(), getMaskedPhone(), normalizeDocumentValue(), PhoneRecoveryStep, RecoveryMethod (+3 more)

### Community 89 - "Cotas e Planos"
Cohesion: 0.21
Nodes (11): MinerOption, UnilevelPlan, UserActivePackage, Plan, PlanosPage(), UserActivePackage, formatCurrencyValue(), getCurrencySymbol() (+3 more)

### Community 90 - "Graduados e Flyer"
Cohesion: 0.16
Nodes (10): CareerLevelOption, GraduadosDaEquipePage(), Graduation, PaginationInfo, CareerLevelData, fjalla, FlyerModal(), FlyerModalProps (+2 more)

### Community 91 - "Vitrine da Loja"
Cohesion: 0.27
Nodes (9): LojaPage(), ProdutoDetalhesPage(), CartIcon(), ProductCard(), ProductCardProps, useStoreCartContext(), useStoreCart(), ProductFilters (+1 more)

### Community 92 - "Tipos Next-Auth e Pedido"
Cohesion: 0.15
Nodes (9): Order, PagarMeWebhookPayload, PaymentConfirmationResponse, JWT, next-auth, next-auth/jwt, Session, SessionPackage (+1 more)

### Community 93 - "Admin Graduados e Pontos"
Cohesion: 0.21
Nodes (10): CareerLevelOption, GraduadosPage(), Graduation, PaginationInfo, CareerLevelOption, PaginationInfo, PointsRankItem, PontosPage() (+2 more)

### Community 94 - "Árvore Unilevel"
Cohesion: 0.22
Nodes (11): GET(), GET(), buildUnilevelTree(), calculateNetworkStats(), GET(), UnilevelNetworkData, UnilevelNode, getUserPointsDisplay() (+3 more)

### Community 95 - "Webhook OpenPix"
Cohesion: 0.29
Nodes (10): executarBonificacoes(), POST(), processarCobrancaCompletada(), processarCobrancaCriada(), processarCobrancaExpirada(), processarMovimentoCriado(), processarPagamentoSaque(), processarTransacaoCriada() (+2 more)

### Community 96 - "Admin Clube 300"
Cohesion: 0.21
Nodes (9): Clube300Member, Clube300Page(), AdminLayoutPage(), MinerApiResponse, AdminLayout(), Miner, MinerListResponse, MinerOption (+1 more)

### Community 97 - "Rede Inicial"
Cohesion: 0.23
Nodes (8): GET(), applyInitialNetworkLogic(), applyPackageValueReorganization(), getInitialNetworkStats(), getTop2Investors(), InitialNetworkResult, TopInvestor, UserWithPackageValue

### Community 98 - "Rede Antiga (cópia)"
Cohesion: 0.20
Nodes (9): BreadcrumbItem, NetworkData, NetworkNodeData, NetworkStats, nodeTypes, RedePage(), NetworkNode(), NetworkNodeData (+1 more)

### Community 99 - "Recursos da Blacklist"
Cohesion: 0.31
Nodes (9): GET(), BLACKLIST_RESOURCES, BlacklistAction, BlacklistOption, BlacklistResource, getActionLabel(), getAllResources(), getFlatBlacklistOptions() (+1 more)

### Community 100 - "Contratos e Compra de Pacote"
Cohesion: 0.29
Nodes (9): generateContractContent(), GET(), POST(), POST(), POST(), processPackagePurchase(), validateUserNetworkParticipation(), findSpilloverPosition() (+1 more)

### Community 102 - "Página de Carreira"
Cohesion: 0.22
Nodes (10): CareerData, CareerLevel, CareerPrize, CarreiraPage(), CurrentCareer, DirectReferral, DirectsRequirement, getCareerColors() (+2 more)

### Community 103 - "Integração Pagar.me Pacotes"
Cohesion: 0.27
Nodes (8): PackagePurchaseRequest, PackagePurchaseResponse, purchasePackageWithPagarMe(), createBoletoPayment(), createCreditCardPayment(), createPixPayment(), generateOrderCode(), userPackageCreate()

### Community 104 - "Webhook Stripe Payouts"
Cohesion: 0.31
Nodes (8): POST(), processPayoutCanceled(), processPayoutCreated(), processPayoutFailed(), processPayoutPaid(), processPayoutUpdated(), stripe, StripePayoutEvent

### Community 105 - "Layout Raiz"
Cohesion: 0.29
Nodes (6): inter, RootLayout(), SessionProvider(), SessionProviderProps, ToasterProvider(), setupBigIntSerialization()

### Community 106 - "HTTP Bradesco"
Cohesion: 0.27
Nodes (6): agentCache, BradescoEnvironment, ConsultaContasOptions, requestBradesco(), RequestBradescoOptions, BradescoPixClientOptions

### Community 107 - "Rastreio de Bônus Direto"
Cohesion: 0.22
Nodes (3): calculateProportionalDirectBonus(), calculateAllowedBonus(), getOrCreateBonusTracker()

### Community 108 - "Posicionamento por Lado"
Cohesion: 0.39
Nodes (7): GET(), POST(), applyPreferredSidePlacement(), findPreferredSidePlacement(), PreferredSidePlacementResult, searchLastAvailablePosition(), verifyPreferredSidePlacement()

### Community 109 - "Carrinho e Layout Dashboard"
Cohesion: 0.33
Nodes (7): DashboardLayoutPage(), DashboardLayout(), StoreCartContext, StoreCartContextValue, StoreCartProvider(), StoreCartProviderProps, CartItem

### Community 110 - "Guarda de Blacklist"
Cohesion: 0.31
Nodes (6): BlacklistGuard(), BlacklistGuardProps, BlacklistEntry, fetcher(), useBlacklist(), UseBlacklistReturn

### Community 111 - "Página Simulador"
Cohesion: 0.29
Nodes (7): CycleExecutionResult, DatabaseStats, ExistingUser, Package, SimuladorBonificacoes(), SimulationResult, TestUser

### Community 112 - "API do Carrinho"
Cohesion: 0.25
Nodes (3): addItemSchema, removeItemSchema, updateItemSchema

### Community 113 - "Serviço de Email"
Cohesion: 0.29
Nodes (4): EmailConfirmationData, FinancialPasswordResetData, PasswordResetData, resend

### Community 114 - "Utilitários de Rede HTTP"
Cohesion: 0.36
Nodes (7): convertToFetchOptions(), FetchRequestConfig, fetchWithCurl(), logAxiosCurlRequest, logCurlRequest(), logRequestAsCurl(), requestWithCurl()

### Community 115 - "Status do Pedido"
Cohesion: 0.25
Nodes (8): StoreOrderStatus, CANCELLED, CONFIRMED, DELIVERED, PENDING, PROCESSING, REFUNDED, SHIPPED

### Community 116 - "Tipos de Promoção"
Cohesion: 0.36
Nodes (7): Coupon, CouponWithPromotion, CouponWithUser, CreatePromotionInput, Promotion, PromotionWithCoupons, UpdatePromotionInput

### Community 117 - "API de Diretos"
Cohesion: 0.33
Nodes (4): calculateLevelInRelationToUser(), checkUserInNetwork(), GET(), metadata

### Community 118 - "Reset Senha Financeira UI"
Cohesion: 0.43
Nodes (5): dynamic, metadata, Page(), ResetFinancialPasswordPage(), ResetFinancialPasswordPageContent()

### Community 119 - "Editar Perfil"
Cohesion: 0.33
Nodes (4): EditProfileModalProps, ProfileFormData, profileSchema, DocumentInputProps

### Community 120 - "Input de Telefone"
Cohesion: 0.48
Nodes (6): PhoneInput(), PhoneInputProps, formatPhoneInternational(), getPhoneCountryCodes(), getPhoneMaxLength(), getPhonePlaceholder()

### Community 121 - "Navbar e Logo"
Cohesion: 0.38
Nodes (5): Navbar(), NavbarProps, poppins, LogoMinerstone(), LogoMinerstoneProps

### Community 122 - "Eventos OpenPix"
Cohesion: 0.29
Nodes (7): OpenPixEventType, CHARGE_COMPLETED, CHARGE_CREATED, CHARGE_EXPIRED, MOVEMENT_CREATED, TRANSACTION_CREATED, TRANSACTION_RECEIVED

### Community 123 - "Estatísticas Admin"
Cohesion: 0.53
Nodes (5): calculateMonthlyGrowth(), formatTimeAgo(), GET(), getRecentActivity(), RecentActivity

### Community 127 - "Página de Login"
Cohesion: 0.53
Nodes (4): dynamic, Page(), LoginPage(), LoginPageContent()

### Community 128 - "Página Reset de Senha"
Cohesion: 0.53
Nodes (4): dynamic, Page(), ResetPasswordPage(), ResetPasswordPageContent()

### Community 129 - "Métodos de Pagamento"
Cohesion: 0.33
Nodes (6): StorePaymentMethod, BALANCE, BOLETO, CREDIT_CARD, DEBIT_CARD, PIX

### Community 130 - "Status de Pagamento"
Cohesion: 0.33
Nodes (6): StorePaymentStatus, CANCELLED, FAILED, PAID, PENDING, REFUNDED

### Community 131 - "Breakpoints"
Cohesion: 0.33
Nodes (6): Breakpoint, LG, MD, SM, XL, XXL

### Community 132 - "Tipos de Chave PIX"
Cohesion: 0.33
Nodes (6): PixKeyType, CNPJ, CPF, EMAIL, PHONE, RANDOM

### Community 133 - "API de Parâmetros"
Cohesion: 0.50
Nodes (3): createParameterSchema, POST(), validateParameterValue()

### Community 134 - "Criação de Conta Bancária"
Cohesion: 0.50
Nodes (4): BANK_NAMES, createBankAccountSchema, POST(), createStripeConnectAccount()

### Community 135 - "Tokenização de Cartão"
Cohesion: 0.50
Nodes (4): cardDataSchema, POST(), tokenizeCardSchema, createCardToken()

### Community 136 - "API de Downlines"
Cohesion: 0.50
Nodes (3): DownlineCache, GET(), processDownline()

### Community 137 - "Teste de Mesa"
Cohesion: 0.40
Nodes (3): PACKAGES, SimulationStep, TestUser

### Community 138 - "Área de Transferência"
Cohesion: 0.60
Nodes (3): copyToClipboard(), copyWithFeedback(), shareOrCopy()

### Community 139 - "Processador de Chave PIX"
Cohesion: 0.60
Nodes (4): PixKeyType, processAndValidatePixKey(), processPixKeyForOpenPix(), validateProcessedPixKey()

### Community 140 - "Logs de Auditoria"
Cohesion: 0.67
Nodes (3): AuditItem, formatActionLabel(), LogsAuditoriaPage()

### Community 142 - "Confirmação de Email"
Cohesion: 0.67
Nodes (3): ConfirmEmailContent(), ConfirmEmailPage(), dynamic

## Knowledge Gaps
- **80 isolated node(s):** `PHYSICAL`, `DIGITAL`, `PENDING`, `CONFIRMED`, `PROCESSING` (+75 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1264 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Prisma e Simulador Admin` to `APIs Diversas de Carreira/Ativação`, `APIs Admin de Pacotes/Promoções`, `API de Parâmetros`, `Criação de Conta Bancária`, `Lógica Unilevel e Lucros`, `Tipos de Transação e Saldos`, `API de Blacklist`, `Lógica de Negócio e Ciclos`, `Pedidos e Pagamentos com Bônus`, `Papéis e Permissões`, `Stripe e Conversão de Moeda`, `Transferências PIX Bradesco`, `API Pedido do Usuário`, `API de Downlines`, `Serviço Financeiro e Auth`, `Reset Senha Financeira por SMS`, `Reset de Senha por SMS`, `Limites de Compra e Saques`, `Verificação de Telefone`, `Cobrança Pagar.me`, `Middleware de Autorização`, `Teto de Bônus Direto`, `Upgrade de Pacote`, `Migração Unilevel e Clube300`, `APIs Admin de Parâmetros/Saques`, `Firebase e Cobrança OpenPix`, `Payouts Stripe`, `Cron Jobs`, `Cadastro e Pacote Ativo`, `Cashback Clube300`, `Spillover da Árvore`, `Serviço MLM da Loja`, `Webhook Pagar.me`, `Troca de Senhas`, `Promoções e Processamento de Pacote`, `API de Mineradoras`, `API de Permissões`, `Cálculo de Pontos`, `Stripe Connect`, `Simulador de Compra`, `Webhook Stripe`, `Tipos Next-Auth e Pedido`, `Árvore Unilevel`, `Webhook OpenPix`, `Rede Inicial`, `Contratos e Compra de Pacote`, `Cotações`, `Integração Pagar.me Pacotes`, `Webhook Stripe Payouts`, `Rastreio de Bônus Direto`, `Posicionamento por Lado`, `API do Carrinho`, `API de Diretos`, `Estatísticas Admin`, `API Categorias Admin`, `API Produtos Admin`, `API Chave PIX`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `PHYSICAL`, `DIGITAL`, `PENDING` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Blacklist e Bônus` be split into smaller, more focused modules?**
  _Cohesion score 0.03503774391112377 - nodes in this community are weakly interconnected._
- **Why does `pagarMeAPI` connect `Cliente API Pagar.me` to `APIs Diversas de Carreira/Ativação`, `Cobrança Pagar.me`, `Criação de Conta Bancária`, `Tipos Pagar.me`, `Limites de Compra e Saques`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `Prisma e Simulador Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.032383808095952024 - nodes in this community are weakly interconnected._
- **Why does `ParameterKeys` connect `Chaves de Parâmetros` to `Lógica Unilevel e Lucros`, `Prisma e Simulador Admin`, `Lógica de Negócio e Ciclos`, `Limites de Compra e Saques`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `UI Admin Mineradoras/Pacotes` be split into smaller, more focused modules?**
  _Cohesion score 0.07321867321867322 - nodes in this community are weakly interconnected._