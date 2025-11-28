# [0.2.0](https://github.com/jamesainslie/mdview/compare/v0.1.2...v0.2.0) (2025-11-28)


### Bug Fixes

* **file-scanner:** add context invalidation detection with debug logging ([9084947](https://github.com/jamesainslie/mdview/commit/9084947484b74f1b984cf156112aafb35ae63c92))
* **section-splitter:** track code fence state to prevent false heading detection ([325a868](https://github.com/jamesainslie/mdview/commit/325a868b7accf076333dd837ff18ac40b0d5d8f4))
* **tests:** correct synchronous error mock in render pipeline test ([e997517](https://github.com/jamesainslie/mdview/commit/e99751786160ac995938658f666f7d42dda0bcdb))


### Features

* **ui:** add log level selector and dynamic version display ([b84cad7](https://github.com/jamesainslie/mdview/commit/b84cad79c6ee742f2d5b3519124ebf087af5dbd2))

## [0.2.3](https://github.com/jamesainslie/mdview/compare/mdview-v0.2.2...mdview-v0.2.3) (2025-11-28)


### Features

* **content:** integrate table of contents into content script ([a765cee](https://github.com/jamesainslie/mdview/commit/a765cee430383b37bf7942b8f937d69222ec7600))
* **core:** add HTML rendering configuration support ([7da9ba8](https://github.com/jamesainslie/mdview/commit/7da9ba83da7e79360f067a83c3d09b1848658499))
* **ui:** add table of contents controls to popup and options ([7c8439c](https://github.com/jamesainslie/mdview/commit/7c8439c6a4c12ac82a9a445df729895afd170f69))
* **ui:** add table of contents styling and layout ([8f83ad5](https://github.com/jamesainslie/mdview/commit/8f83ad5afd8945a3b4ad73d223a1a9b219c811b1))
* **ui:** implement table of contents renderer ([cff69a0](https://github.com/jamesainslie/mdview/commit/cff69a0da5c459ff4db735ab052e9644a28db819))
* **ui:** implement table of contents with navigation and configuration ([82ea0db](https://github.com/jamesainslie/mdview/commit/82ea0db194e5c30d8dd4a8eb9321d67797a21651))


### Bug Fixes

* **hooks:** remove deprecated husky shebang for v10 compatibility ([a4501ab](https://github.com/jamesainslie/mdview/commit/a4501ab371d44badce18402569bbae8dad54abf5))


### Documentation

* **contributing:** document git hooks for automated quality checks ([a03fdcf](https://github.com/jamesainslie/mdview/commit/a03fdcf996e1f56bd39d6f91d080de3937125b13))
* update README with TOC feature and improve layout ([2a7da59](https://github.com/jamesainslie/mdview/commit/2a7da59fd725972b037bc5a986b5890084eb81f9))


### Tests

* **core:** fix render-pipeline test mock for updateOptions ([6e0c0a2](https://github.com/jamesainslie/mdview/commit/6e0c0a21aaf3a912f8c9245298865be12b73da37))

## [0.2.2](https://github.com/jamesainslie/mdview/compare/mdview-v0.2.1...mdview-v0.2.2) (2025-11-28)


### Documentation

* add Chrome Web Store submission assets ([2b6329b](https://github.com/jamesainslie/mdview/commit/2b6329be882de5ea1babfa93db6edd0ae207e763))
* add feature showcase document ([19ebf6e](https://github.com/jamesainslie/mdview/commit/19ebf6e7326314a8aabec2872048b967dfbb786c))
* add privacy policy ([874a0e1](https://github.com/jamesainslie/mdview/commit/874a0e1045e5acf95815fb4c7d2fa01a178b5f41))

## [0.2.1](https://github.com/jamesainslie/mdview/compare/mdview-v0.2.0...mdview-v0.2.1) (2025-11-28)


### Features

* **background:** add service worker and state management ([00fda15](https://github.com/jamesainslie/mdview/commit/00fda1538e2cb8071fb870ba10bb62fe2b6b60c8))
* **background:** update service worker with cache and log state ([a20bcb3](https://github.com/jamesainslie/mdview/commit/a20bcb37acf3d0b5c900e56e4ae63034df2b09c5))
* **content:** add content script and styles ([5981736](https://github.com/jamesainslie/mdview/commit/59817364660975bf7cd4b36b81d6567207239aed))
* **content:** integrate progressive rendering and logging ([5a3296e](https://github.com/jamesainslie/mdview/commit/5a3296e8f2196220f3db21d1febad73c63bb551d))
* **core:** add logging, caching, and worker infrastructure ([ac57684](https://github.com/jamesainslie/mdview/commit/ac57684ba0c5a60e4d9dfeb956522cec5be70f70))
* **core:** implement markdown rendering pipeline ([b494017](https://github.com/jamesainslie/mdview/commit/b494017c50f39a174cdec253cd62a19913f67f84))
* **core:** implement progressive hydration and file watcher ([2d0ef02](https://github.com/jamesainslie/mdview/commit/2d0ef025c32eebdc08c78322bc6621017cf820ee))
* **extension:** add manifest and assets ([f598491](https://github.com/jamesainslie/mdview/commit/f598491aca16cd59d396fa831e00ab9d06d2f46a))
* **renderer:** enhance render pipeline with mermaid and progressive features ([8aed9e2](https://github.com/jamesainslie/mdview/commit/8aed9e224bf060915cc43fb6bf99adfca854ef8e))
* **renderer:** optimize mermaid diagram rendering ([04ecc14](https://github.com/jamesainslie/mdview/commit/04ecc14f9706af796a9c04bd2a36e48f07a4bb00))
* **renderers:** add syntax and diagram rendering ([64d42d7](https://github.com/jamesainslie/mdview/commit/64d42d7f9a6275f8b166322a64deab1eeddbba7c))
* **theme:** implement theme initialization and application ([a7608e6](https://github.com/jamesainslie/mdview/commit/a7608e632582c8fb1dd91ae6a3fc651e2beed21a))
* **themes:** implement theme system ([67d037f](https://github.com/jamesainslie/mdview/commit/67d037f240451335cbc9fa066e9f0293750d7caf))
* **types:** define application interfaces ([3f4b01a](https://github.com/jamesainslie/mdview/commit/3f4b01ae247c5788e9223db8249ef80c5128b468))
* **ui:** add log level selector and dynamic version display ([b84cad7](https://github.com/jamesainslie/mdview/commit/b84cad79c6ee742f2d5b3519124ebf087af5dbd2))
* **ui:** add log level settings and popup improvements ([bdbaa5f](https://github.com/jamesainslie/mdview/commit/bdbaa5f78658f0be912fd11d68801b356f67931a))
* **ui:** add popup and options interfaces ([459ea00](https://github.com/jamesainslie/mdview/commit/459ea0015cdfef0289f645a0945b4a5bafead763))
* **ui:** enhance settings and theme management ([5fcd240](https://github.com/jamesainslie/mdview/commit/5fcd240ede321d60560bb8eeb306771edd8fee27))
* **utils:** add debug logging system ([5b3635c](https://github.com/jamesainslie/mdview/commit/5b3635cee3863dee629de815d8d0e3a63ed750b2))
* **utils:** add security and file utilities ([bd1a8f1](https://github.com/jamesainslie/mdview/commit/bd1a8f1e79e6ea1be39539eff8ff403d6bc95e0a))


### Bug Fixes

* **ci:** disable npm publishing in semantic-release ([1c38404](https://github.com/jamesainslie/mdview/commit/1c384044e8d7f86c54b9e49357257439875e69a8))
* **ci:** disable npm publishing in semantic-release ([c7ee20b](https://github.com/jamesainslie/mdview/commit/c7ee20bde5ecf3cb56c6c8caf4ee9377b9a7aa6f))
* **content:** add null check for state in debug mode setter ([712be60](https://github.com/jamesainslie/mdview/commit/712be607e4c21dfa70f30d74a7e1a846abb3061f))
* **content:** ensure loading overlay visibility and re-enable auto-reload ([8c0a80d](https://github.com/jamesainslie/mdview/commit/8c0a80d1f6c7257f2c67e728ed940669a4c873b7))
* **core:** resolve file scanner errors and rendering issues ([24c12d4](https://github.com/jamesainslie/mdview/commit/24c12d4b8cf8d05db633c5b241cd9fd42bfea97e))
* **file-scanner:** add context invalidation detection with debug logging ([9084947](https://github.com/jamesainslie/mdview/commit/9084947484b74f1b984cf156112aafb35ae63c92))
* **file-scanner:** prevent infinite loop in file watcher initialization ([3ccb5d8](https://github.com/jamesainslie/mdview/commit/3ccb5d837e6b67a62ecce562b2436bd81e93f04e))
* **lint:** resolve type safety and async errors ([d038756](https://github.com/jamesainslie/mdview/commit/d03875672cc8c30328d6dba3fb0e68b34b46acf1))
* **mermaid:** correct SVG type for getBBox method calls ([b812d9b](https://github.com/jamesainslie/mdview/commit/b812d9bff8213f81105a2fe9a7a9f3c7b2d34841))
* **mermaid:** correct zoom, fit, and maximize controls ([22b7221](https://github.com/jamesainslie/mdview/commit/22b72219d67b56c02eaab8ad326cf0e58124bff0))
* **mermaid:** use global registry to preserve diagram code ([5c1ea1b](https://github.com/jamesainslie/mdview/commit/5c1ea1b9c7fbb5c0ddd312d1b34c0832c58afde2))
* **renderer:** ensure mermaid theme updates dynamically ([3b5f424](https://github.com/jamesainslie/mdview/commit/3b5f42429d71f4d47a619bb8af3d8ecd39fd8c6e))
* resolve TypeScript build errors for release ([08df090](https://github.com/jamesainslie/mdview/commit/08df090ae484840b240e0f182f23234880628731))
* **section-splitter:** track code fence state to prevent false heading detection ([325a868](https://github.com/jamesainslie/mdview/commit/325a868b7accf076333dd837ff18ac40b0d5d8f4))
* **tests:** correct synchronous error mock in render pipeline test ([e997517](https://github.com/jamesainslie/mdview/commit/e99751786160ac995938658f666f7d42dda0bcdb))


### Code Refactoring

* improve code quality and establish CI pipeline ([62588e2](https://github.com/jamesainslie/mdview/commit/62588e25efc4841dc39a24db08ac5ede70093602))
* **logger:** replace console calls with debug logger ([d39f021](https://github.com/jamesainslie/mdview/commit/d39f0211a675ffb202895851779c49f51dc4bb8e))
* **workers:** improve file protocol logging clarity ([05e6672](https://github.com/jamesainslie/mdview/commit/05e6672e6d9394a679f8a93d3df3d60cbd39f699))
* **workers:** remove unused file monitor worker ([334d5eb](https://github.com/jamesainslie/mdview/commit/334d5eba1495b5b428735c53493bd12316a5f3ea))


### Documentation

* remove support email from README.md ([ee674de](https://github.com/jamesainslie/mdview/commit/ee674de5e8c4c51afba03179d780c0c113acd75a))
* update project documentation ([b711d00](https://github.com/jamesainslie/mdview/commit/b711d00d8dfea9abe36418e75d8bee5d9fb64b9c))


### Tests

* **background:** add service worker fetch error handling tests ([1950222](https://github.com/jamesainslie/mdview/commit/1950222d6031027457619a4c5e4b9ac3c01f98e0))
* implement comprehensive unit test suite ([1c20954](https://github.com/jamesainslie/mdview/commit/1c2095417739b3c9817be2b690d9dda825f51b57))
* implement comprehensive unit test suite and fix fetch error handling ([29b59c9](https://github.com/jamesainslie/mdview/commit/29b59c91f2a98516b43b772bcbbb9b3238802636))
* **infra:** setup vitest configuration and helpers ([dae6937](https://github.com/jamesainslie/mdview/commit/dae6937fd58851cb0a67dd2a807f293d38ce658f))
* **unit:** implement core rendering tests ([c9ab68a](https://github.com/jamesainslie/mdview/commit/c9ab68a110b36d08eaaff18a229dba7b6b06b059))


### Build System

* add icon generation scripts ([c3c5890](https://github.com/jamesainslie/mdview/commit/c3c58904f5d72e7b130a24a7a508d35df4a0c34e))
* **deps:** add jsdom for testing environment ([530ff75](https://github.com/jamesainslie/mdview/commit/530ff759fcaa81697a4efb27176903d35653ea9d))


### Continuous Integration

* add eslint workflow for continuous integration ([6dd61ef](https://github.com/jamesainslie/mdview/commit/6dd61efaf76f3a8edca28fb1abeda8f93a001172))
* add release-extension workflow ([3ebf34a](https://github.com/jamesainslie/mdview/commit/3ebf34a5950351a549663b271437c45afbce2572))
* add release-please configuration ([7675508](https://github.com/jamesainslie/mdview/commit/76755083523e51cfbfea35b35a054adac5116211))
* add release-please workflow ([c14e868](https://github.com/jamesainslie/mdview/commit/c14e8687142cc9c5d6c50dd562fe6196f28d98c3))
* add test execution to CI workflow ([2c881f2](https://github.com/jamesainslie/mdview/commit/2c881f2f386fb4741ec51bea687d480a9fdefecb))
* migrate to release-please for controlled releases ([7107b9a](https://github.com/jamesainslie/mdview/commit/7107b9a37951499ce6cfb0a6fb4a4260ffa423a0))
* remove semantic-release ([0c7a523](https://github.com/jamesainslie/mdview/commit/0c7a523ce6e26e20486b1aa7ed1d00fe2ddaed75))
* setup automated release pipeline and version sync ([8c8b477](https://github.com/jamesainslie/mdview/commit/8c8b4771c6d376134d7f19bfdbac2771b29ddba3))
* setup automated release pipeline and version sync ([e231093](https://github.com/jamesainslie/mdview/commit/e2310936e56ebae897100d4e4276787e937f8021))

## [0.1.2](https://github.com/jamesainslie/mdview/compare/v0.1.1...v0.1.2) (2025-11-20)


### Bug Fixes

* **lint:** resolve type safety and async errors ([d038756](https://github.com/jamesainslie/mdview/commit/d03875672cc8c30328d6dba3fb0e68b34b46acf1))
* resolve TypeScript build errors for release ([08df090](https://github.com/jamesainslie/mdview/commit/08df090ae484840b240e0f182f23234880628731))

## [0.1.1](https://github.com/jamesainslie/mdview/compare/v0.1.0...v0.1.1) (2025-11-19)


### Bug Fixes

* **ci:** disable npm publishing in semantic-release ([c7ee20b](https://github.com/jamesainslie/mdview/commit/c7ee20bde5ecf3cb56c6c8caf4ee9377b9a7aa6f))
