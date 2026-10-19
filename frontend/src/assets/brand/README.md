# Símbolo EduTrack

Refinamento do monograma enviado pelo usuário, com o E, livro e seta. Nome e slogan removidos dos arquivos selecionados.

As páginas de entrada usam uma composição completa em `components/auth/AuthBrand.tsx`: a mesma máscara do símbolo, o nome EDUTRACK e o slogan “Seu dashboard de estudos”. O texto é renderizado pela interface para permanecer nítido em diferentes densidades de tela; o JPEG não é esticado nem recebe um fundo branco. A composição é crimson no tema claro e off-white no escuro, restrita a `AuthLayout`. A interface interna e o favicon continuam usando somente o símbolo.

- edutrack-symbol-crimson.png: símbolo crimson em fundo transparente.
- edutrack-symbol-graphite.png: alternativa grafite/navy em fundo transparente.
- edutrack-symbol-dark-background.png: símbolo claro sobre fundo navy, para apresentação.
- edutrack-symbol-light.svg: apresentação clara transparente, com a mesma máscara do crimson.
- edutrack-symbol.svg: apresentação crimson transparente com a mesma máscara.

As imagens foram refinadas pela ferramenta image_gen integrada (skill imagegen). Os SVGs de apresentação incorporam a máscara raster do PNG (1254 × 1254 pixels); não são uma vetorização Bézier. A interface utiliza a mesma silhueta em CSS mask, com preenchimento sólido crimson no tema claro e off-white no tema escuro, evitando alterações de forma entre versões. O JPEG original permanece preservado em ../edutrack-logo.jpeg.

## Vídeo de entrada

Os arquivos em `../intro/` derivam do vídeo de 10 segundos enviado pelo usuário. A versão clara preserva as cores originais; a escura adapta a luminância para fundo navy #10141b e marca crimson clara #f29ba2. Ambas preservam a animação, a resolução de 1280 × 720, os 24 fps e a trilha AAC original. Os MP4 usam H.264/yuv420p e metadados de reprodução no início do arquivo (fast start). Os JPEGs são quadros finais para a prévia e a apresentação sem movimento.

A conversão foi feita com FFmpeg temporário, sem adicionar dependências ao projeto. O arquivo original do usuário não foi alterado. A introdução inicia sem som e preenche a tela, sem controles visíveis, seguindo o tema ativo da conta. A trilha permanece nos arquivos de mídia.

Prompts finais dos PNGs selecionados:

## crimson

Use case: precise-object-edit / logo-brand. Edit target: the attached original EduTrack logo. Create a high-resolution production-quality cleanup of ONLY its existing monogram symbol: the burgundy capital E formed by a broad rising ribbon and a northeast pointing arrow, with an open book integrated in the middle. Preserve the original silhouette, proportions, rounded corners, arrow direction, distinctive curved separation between upper ribbon and lower E, and the book with three symmetrical page strokes. Remove all EDUTRACK lettering and the tagline entirely. Clean JPEG artifacts and irregular edges into extremely crisp smooth vector-like contours. Flat single solid crimson/burgundy #8B2028, no gradients, no light, no texture, no shadow, no bevel, no background plate. Actual transparent background and transparent negative space in the book/separations. One centered symbol, tightly but comfortably framed with equal safe padding, square canvas, at least 2048px if supported. No extra objects, no invented marks, no text. This is a faithful refinement of the supplied brand, not a redesign.

## graphite

Use case: precise-object-edit. Edit target: provided transparent EduTrack monogram. Recolor ONLY the existing symbol to one perfectly uniform solid #172235 very dark navy/graphite, intended for white or off-white interfaces and monochrome print. Preserve the EXACT silhouette, E/ribbon/arrow/book geometry, proportions, framing, canvas size, every negative-space curve and transparent alpha background. Improve any speckled or jagged edge pixels into clean precise antialiased contours without changing shape. No text at all. No EDUTRACK wordmark. No slogan. No extra objects. No plate. Absolutely no gradient, shading, lighting, texture, glow, bevel, shadow or mockup. One faithful flat monochrome symbol on actual transparent background.

## dark-background

Use case: precise-object-edit, logo-brand. Image1 is the exact original EduTrack logo reference. Produce a polished DARK BACKGROUND VERSION containing ONLY the existing E / rising ribbon arrow / open book monogram, no wordmark, absolutely no letters or slogan below. Remove the white background and all typography. Preserve original silhouette and book geometry faithfully. The symbol must be clean solid warm off-white #F5F1E9 and the ENTIRE canvas including every negative space/gap must be a perfectly flat uniform dark navy #10141B. Solid opaque background, no transparency in this version. Square canvas with symbol centered and balanced safe padding. Extremely crisp smooth antialiased contours, flat vector-like logo finish. NO speckles, distressed edges, gradients, texture, grain, shading, glow, shadows, bevels, plates or extra graphic elements.
