# Changelog

## [0.1.0-alpha.11](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.10...web-v0.1.0-alpha.11) (2026-02-01)


### Features

* replace Montoya slash with vibe echo effect ([f3d869d](https://github.com/devakone/vibe-coding-profiler/commit/f3d869d7d1a5565736948ea80e507a9b476c9018))
* unify brand colors and add Montoya slash flourish ([e699083](https://github.com/devakone/vibe-coding-profiler/commit/e699083367370545957ff0d0f9cf428166c113df))


### Bug Fixes

* enable share image generation for repo analysis pages ([01a4d0c](https://github.com/devakone/vibe-coding-profiler/commit/01a4d0ce920a057e551255fdfbde96969000f2a1))
* remove old vibed.dev fallbacks and update branding references ([0954d0b](https://github.com/devakone/vibe-coding-profiler/commit/0954d0b9bb7c42cd83cfde00df015c86a094852e))
* restore rounded corners on analysis cards after overflow-hidden removal ([6416a65](https://github.com/devakone/vibe-coding-profiler/commit/6416a654b20907ed24dbac574a579c729ce8fdde))
* use maybeSingle for profile share route to avoid PGRST116 crash ([6193cea](https://github.com/devakone/vibe-coding-profiler/commit/6193cea160fd8a130b67ee8e7fa18a735e8e4f7f))

## [0.1.0-alpha.10](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.9...web-v0.1.0-alpha.10) (2026-01-31)


### Features

* rewrite vibe coding language to be AI-native ([e45e55e](https://github.com/devakone/vibe-coding-profiler/commit/e45e55e4473869c3df80482245c836d19fa21a46))
* simplify top nav with user menu dropdown and app footer ([029ad3a](https://github.com/devakone/vibe-coding-profiler/commit/029ad3af8b0d164d4f906c3eec3447691ba10e0b))


### Bug Fixes

* filter out already-connected repos from Add a Repo picker ([8d08166](https://github.com/devakone/vibe-coding-profiler/commit/8d0816695033c5919ad16b734777d125a6abe718))
* resolve story export crash and B&W PNG output in share routes ([7193754](https://github.com/devakone/vibe-coding-profiler/commit/71937546a9ee003ba1973ea3e315b0d855583a93))

## [0.1.0-alpha.9](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.8...web-v0.1.0-alpha.9) (2026-01-30)


### Bug Fixes

* disable Get Vibe button while analysis job is running ([4a07531](https://github.com/devakone/vibe-coding-profiler/commit/4a0753184ce97d9410591ac991522a17301a41be))

## [0.1.0-alpha.8](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.7...web-v0.1.0-alpha.8) (2026-01-30)


### Bug Fixes

* resolve all lint errors and type issues across codebase ([78d96a6](https://github.com/devakone/vibe-coding-profiler/commit/78d96a6ee602017b3d9a5329dfbcec31a817c93e))
* resolve all npm audit vulnerabilities ([6d5d2b5](https://github.com/devakone/vibe-coding-profiler/commit/6d5d2b531a023f4644d300a3806c2627bf330191))

## [0.1.0-alpha.7](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.6...web-v0.1.0-alpha.7) (2026-01-30)


### Features

* add AI coding tool detection with per-tool metrics and VCP display ([f6fa433](https://github.com/devakone/vibe-coding-profiler/commit/f6fa4334108ec6e7d6f2411262e6097f5e6b5b8b))
* add public profile pages with username system and privacy controls ([6276317](https://github.com/devakone/vibe-coding-profiler/commit/62763172a04e982c24f1138e8291469bbefce050))
* generate share images with detailed persona metrics ([404b273](https://github.com/devakone/vibe-coding-profiler/commit/404b2739b0cb973c749382dfde87cf2388e42b87))
* reorder settings tabs and add `shareJson` to `ShareProps` for exporting data. ([2622244](https://github.com/devakone/vibe-coding-profiler/commit/262224426c00c8ec06ed7d3f86d34d76ea3bc163))


### Bug Fixes

* fix JSON export functionality for profile share data. ([02d170c](https://github.com/devakone/vibe-coding-profiler/commit/02d170c08dc1f0e580037c7a342bd1a30a8be8d2))

## [0.1.0-alpha.6](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.5...web-v0.1.0-alpha.6) (2026-01-29)


### Features

* **settings/repos:** improve UX with platform filtering and simplified view ([61db163](https://github.com/devakone/vibe-coding-profiler/commit/61db163a2006046a0fe99d9a3b57fa66b6eec480))


### Bug Fixes

* address code review observations for multi-platform integration ([3d67b0f](https://github.com/devakone/vibe-coding-profiler/commit/3d67b0f93dbddeab5c4ca176401d0f4b3a5d0f38))
* handle object format for narrative highlights in UnifiedInsightSection ([bc9686a](https://github.com/devakone/vibe-coding-profiler/commit/bc9686aac4ae5b7adca1b725d63e227549fef4d0))
* resolve hydration mismatch in NotificationDropdown ([f987526](https://github.com/devakone/vibe-coding-profiler/commit/f98752674e1e81f9f5a43e173a01d4b42ff67017))

## [0.1.0-alpha.5](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.4...web-v0.1.0-alpha.5) (2026-01-23)


### ⚠ BREAKING CHANGES

* The `github_accounts` table has been renamed to `platform_connections`. All queries referencing `github_accounts` must be updated to use `platform_connections` with the additional `platform` column filter.

### Features

* multi-platform repository integration ([ff0a993](https://github.com/devakone/vibe-coding-profiler/commit/ff0a99388238d02e246553559e96bb655324a939))
* **oauth:** add GitLab and Bitbucket OAuth support ([75a5009](https://github.com/devakone/vibe-coding-profiler/commit/75a500931dafcd5780acf9b4376a471d4e5d7c2e))
* **platforms:** add API endpoints and UI for managing platform connections ([b8a2948](https://github.com/devakone/vibe-coding-profiler/commit/b8a294825156a7954f815408cf297ce530f54007))
* **settings:** add platforms page and extract settings tabs component ([29f9082](https://github.com/devakone/vibe-coding-profiler/commit/29f9082110f790e84d6995c7d1781f5fc63797cb))
* unify repo management for multiple platforms ([d22dd27](https://github.com/devakone/vibe-coding-profiler/commit/d22dd279be5011deb00aaf6126dbe8ea01f9c14c))
* **worker:** support multiple git platforms in fallback worker ([7fc5b95](https://github.com/devakone/vibe-coding-profiler/commit/7fc5b951a2f337e33376ee8ae5b1b4cf0585b7e5))

## [0.1.0-alpha.4](https://github.com/devakone/vibe-coding-profiler/compare/web-v0.1.0-alpha.3...web-v0.1.0-alpha.4) (2026-01-22)


### Features

* **web:** add agents.txt and robots.txt files, update branding to "Vibe Coding Profiler" ([0afc2c8](https://github.com/devakone/vibe-coding-profiler/commit/0afc2c864b9b1a7fce79d7d5fddbf60c2a7a2490))
* **web:** add new aura backgrounds and update persona aura structure ([3590f97](https://github.com/devakone/vibe-coding-profiler/commit/3590f97b9690ff59feb3f50b38de23d06b6be1c1))
* **web:** enhance Open Graph metadata and add dynamic OG image generation ([6b68e45](https://github.com/devakone/vibe-coding-profiler/commit/6b68e455263114fd4fb2a37bb7335270c612fdca))


### Bug Fixes

* **web:** update branding from "vibed.app" to "vibe-coding-profiler.com" ([852cfc5](https://github.com/devakone/vibe-coding-profiler/commit/852cfc511c21b1c40ba29a310668d7686e9af533))

## [0.1.0-alpha.3](https://github.com/devakone/vibe-coding-profile/compare/web-v0.1.0-alpha.2...web-v0.1.0-alpha.3) (2026-01-22)


### Features

* add new persona aura images and update theme colors ([4ca44f2](https://github.com/devakone/vibe-coding-profile/commit/4ca44f2d7613031b3af8d319d5d423586d40bed1))
* implement VCP component system with primitives, blocks, and utilities ([bc6abdd](https://github.com/devakone/vibe-coding-profile/commit/bc6abdd8c577ecd9f4c3c2955fa421b4e182fddc))
* **notifications:** add notification dropdown to header ([aadc064](https://github.com/devakone/vibe-coding-profile/commit/aadc064c2e26ae654e228f1e69912282863a8061))
* update ShareCard component to incorporate persona aura backgrounds and icons ([ad2d4a0](https://github.com/devakone/vibe-coding-profile/commit/ad2d4a0db7b50a8f1299a05734e5ad93c58a5a68))
* **vcp:** add unified and repo VCP display components (P3) ([b6a6179](https://github.com/devakone/vibe-coding-profile/commit/b6a617948ff68601f7b468edaa374cfd79c88004))
* **web:** add tooltip component and integrate into VCP sections ([699433c](https://github.com/devakone/vibe-coding-profile/commit/699433c0f1a3fcae572d58133594d1e9223f6ebb))
* **web:** enhance sharing features with LLM-generated taglines ([ef3b589](https://github.com/devakone/vibe-coding-profile/commit/ef3b589a6cdf71485c2ebef11f20a4692a49be13))
* **web:** enhance user profile sharing and navigation updates ([85ed9a2](https://github.com/devakone/vibe-coding-profile/commit/85ed9a215cc9bd7b2a4a466a586a093614a33638))
* **web:** implement P2 navigation & routes restructure ([9ad5734](https://github.com/devakone/vibe-coding-profile/commit/9ad5734ab6b462e576e81aba39051fb438b4484f))
* **web:** implement redirects and update internal links for improved navigation ([a4ce715](https://github.com/devakone/vibe-coding-profile/commit/a4ce7153c638383b2949601052877d7aef111784))
* **web:** integrate QR code generation and vertical story download feature ([975239d](https://github.com/devakone/vibe-coding-profile/commit/975239d3b4c683c64a4c083658289ac1840d6c0f))
* **web:** refactor AnalysisClient to integrate new VCP components ([f2d2621](https://github.com/devakone/vibe-coding-profile/commit/f2d26211218a4f5d5b17b038db29bfde009edb3b))
* **web:** refactor layout to improve component structure and user experience ([eb88fec](https://github.com/devakone/vibe-coding-profile/commit/eb88fecfa519b1e9b203c7d1b28d701f0c331a21))
* **web:** update navigation labels and enhance analysis insights ([17af33d](https://github.com/devakone/vibe-coding-profile/commit/17af33d3a0a7adfa16210a6c8118dd448aded274))

## [0.1.0-alpha.2](https://github.com/devakone/vibed-coding/compare/web-v0.1.0-alpha.1...web-v0.1.0-alpha.2) (2026-01-21)


### Features

* enhance profile sharing and versioning features ([411ba50](https://github.com/devakone/vibed-coding/commit/411ba506074e2d35c5ec0c07aff8f824a86ef96b))

## [0.1.0-alpha.1](https://github.com/devakone/vibed-coding/compare/web-v0.1.0-alpha.0...web-v0.1.0-alpha.1) (2026-01-20)


### Features

* **admin:** add admin dashboard with persona coverage analysis ([0de7f11](https://github.com/devakone/vibed-coding/commit/0de7f11fd45a781ca01a87bba0979870e980e22e))
* **admin:** add admin dashboard with users, jobs and diagnostics ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **admin:** add diagnostics page for persona rule coverage ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **admin:** add job management with status filtering ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **admin:** add LLM status page for admins (Phase 4) ([b84c8bb](https://github.com/devakone/vibed-coding/commit/b84c8bb20cebf65a62fd374b9d8c7fecfc0a03ac))
* **admin:** add user management with pagination and filtering ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **analysis:** add AI-generated narrative report with fallback ([270941d](https://github.com/devakone/vibed-coding/commit/270941de7c297705bce5f2a1bcebc583f37c5831))
* **analysis:** add history tracking and share card download ([ea777fc](https://github.com/devakone/vibed-coding/commit/ea777fc3caff191ebe4ae18f86997cb8dec39cee))
* **analysis:** add insights generation and display to analysis workflow ([98ed10e](https://github.com/devakone/vibed-coding/commit/98ed10ecabba0e325a671626840109e792f50d75))
* **analysis:** add jobs tab and polling for analysis status ([f5ad83b](https://github.com/devakone/vibed-coding/commit/f5ad83b6edcea31cd91027c2fa5df51309d74f0c))
* **analysis:** add methodology explanation to analysis reports ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **analysis:** add PR metadata ingestion and workflow style detection ([f7bcc98](https://github.com/devakone/vibed-coding/commit/f7bcc98ab1972c61bc60dcfe0e04e198008027f7))
* **analysis:** add user avatar display and improve share UI ([4113213](https://github.com/devakone/vibed-coding/commit/4113213351e46fa9d32b97d110cf8942a987d990))
* **analysis:** build vibed insights experience ([9918787](https://github.com/devakone/vibed-coding/commit/9918787a2cf3490a2ae74dee1c569f8c7a57ade1))
* **api:** implement time-distributed commit sampling for GitHub analysis ([f6f6759](https://github.com/devakone/vibed-coding/commit/f6f675930fc0e5fb533c4e8191391ccdee576441))
* **auth:** add proxy middleware for protected routes and auth handling ([bf05b21](https://github.com/devakone/vibed-coding/commit/bf05b21e02383823d18ab3d78a170e70257a25e6))
* **auth:** improve user auth handling and metadata ([539e726](https://github.com/devakone/vibed-coding/commit/539e7260f2d016644e939b56e6ad59963191a2e8))
* enhance profile and analysis features with new UI and data ([9ead7ba](https://github.com/devakone/vibed-coding/commit/9ead7ba24d8c77abb406b70383b434473bdcbb1f))
* **header:** add methodology link to header and login page ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **home:** implement marketing landing page for unauthenticated users ([22626ef](https://github.com/devakone/vibed-coding/commit/22626ef297d7a1bcdb2751b532d32077353c5f3c))
* implement GitHub OAuth flow and analysis job system ([092e975](https://github.com/devakone/vibed-coding/commit/092e9753f70eb77e6735229b3db3034d8de9b3ca))
* improve UI text and add repo caching ([40c0e02](https://github.com/devakone/vibed-coding/commit/40c0e02f355076a0f4029668d988543b73308c7c))
* **inngest:** add background job processing with Inngest integration ([2fb8b14](https://github.com/devakone/vibed-coding/commit/2fb8b144e756333ff8d8d69ce022d33971f1e76b))
* **jobs:** add jobs context for analysis notifications and unread counts ([f5793c4](https://github.com/devakone/vibed-coding/commit/f5793c4bd3829ac28d8ae8d0b3a359d1a0f09295))
* **llm:** add admin UI and unified LLM provider support ([0e9eb22](https://github.com/devakone/vibed-coding/commit/0e9eb225f53107ac8e0071931300104eb549c923))
* **llm:** add user API key management (Phase 2) ([0849f21](https://github.com/devakone/vibed-coding/commit/0849f21c2cbe976b85a88dd210120181f2ff29cb))
* **llm:** add user opt-in for LLM narratives with privacy controls ([4b595fd](https://github.com/devakone/vibed-coding/commit/4b595fd794b478a2daadb3e0454579ebfc4e0b21))
* **llm:** complete Phase 5 documentation and admin APIs ([a57fc2a](https://github.com/devakone/vibed-coding/commit/a57fc2a4ef55ee43fd4e03048f572062263d5439))
* **llm:** implement free tier and key resolution (Phase 3) ([a296804](https://github.com/devakone/vibed-coding/commit/a296804ad63c93b0eb157e094e5f7b2a7d9b6f46))
* **llm:** read platform LLM config from database instead of env vars ([b0359b4](https://github.com/devakone/vibed-coding/commit/b0359b46f91dd132bd447acb7cd35cdcd4d92fc2))
* **login:** add security and home links to login page ([22626ef](https://github.com/devakone/vibed-coding/commit/22626ef297d7a1bcdb2751b532d32077353c5f3c))
* **methodology:** add methodology page explaining persona computation ([be6bf6d](https://github.com/devakone/vibed-coding/commit/be6bf6dad5b4dd8a05b0734243c3b06358bdf1d5))
* **profile:** add LLM-generated narrative support for profiles ([00e2226](https://github.com/devakone/vibed-coding/commit/00e2226ce012bb864137e6b4375d8a5edad3adf0))
* **profile:** implement user profile aggregation and UI ([824d28a](https://github.com/devakone/vibed-coding/commit/824d28a28dcc94a8f2826d2bba86fa03c01effce))
* **profile:** improve persona detection and add debug endpoint ([d3d602f](https://github.com/devakone/vibed-coding/commit/d3d602f76a665e1f7bcc4579d59557e96aa7b25e))
* **profile:** rebuild user profile when missing analysis job ([14b1925](https://github.com/devakone/vibed-coding/commit/14b19259cc04fd71b74e785cdec62dc7175561a1))
* rebrand from Bolokono to Vibed Coding ([f9074cb](https://github.com/devakone/vibed-coding/commit/f9074cb5739891e4e9bcee4b2e9c6fe6a76bbc71))
* **repos:** add command palette and popover UI components ([7422975](https://github.com/devakone/vibed-coding/commit/7422975d043511dedde574a9c80c17083772330b))
* restructure as Turborepo monorepo ([12662f7](https://github.com/devakone/vibed-coding/commit/12662f7df45e9fbda5eaecad00c2a6d463710ca2))
* **security:** create new security page with data handling details ([22626ef](https://github.com/devakone/vibed-coding/commit/22626ef297d7a1bcdb2751b532d32077353c5f3c))
* **share:** implement multi-platform share functionality with responsive assets ([eac3781](https://github.com/devakone/vibed-coding/commit/eac3781a4c11faaacd7d4f127ccc4c7058670b35))
* **toast:** add toast notifications for repo analysis and connection ([342a1dd](https://github.com/devakone/vibed-coding/commit/342a1dd72919242595a5584b5c4839b68526e426))
* **ui:** add app header, theme system, and analysis page ([99e08d3](https://github.com/devakone/vibed-coding/commit/99e08d3fc4379286aa3db2014bfc54eae68c14fe))
* **ui:** improve label formatting for metrics and rules ([8a38657](https://github.com/devakone/vibed-coding/commit/8a38657236bcb9e39a588f1155698c13cc3ca242))
* **ui:** update dark theme styles and enhance analysis page ([2e6a6ca](https://github.com/devakone/vibed-coding/commit/2e6a6caab2d85bc1811b5ecd38e0e93d3ce58691))
* **web:** add share endpoint for analysis insights ([99e356d](https://github.com/devakone/vibed-coding/commit/99e356d70c397993ed77fa025801eafac1a9d432))
* **worker:** add health server and env file loading ([f742760](https://github.com/devakone/vibed-coding/commit/f742760bbe77cfa9f641a3b45ba78758047909a9))


### Bug Fixes

* correct import path for tw-animate-css ([7b9dfb6](https://github.com/devakone/vibed-coding/commit/7b9dfb6ec09af21c2e9cb5a41299c6ef9abd4122))
* **privacy:** remove commit message content from narrative analysis ([deb205e](https://github.com/devakone/vibed-coding/commit/deb205e297c4b3a72b67a9ab423d02cb28e6c324))
