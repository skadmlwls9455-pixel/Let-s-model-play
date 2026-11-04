# 01. 메인 테마(머니코드 × 돌림노래)와 "안 질리는 루프" 리서치

> 대상: 뽈뽈 문어 (비 오는 다락방, 방치형 동반자 게임) · 2A03/게임보이풍 numpy 합성 · 오리지널 작곡
> 표기: **[확인]** 출처에서 확인됨 · **[스니펫]** 검색 결과 요약만 확인(원문 페이지는 이 세션 네트워크 정책 때문에 열 수 없었음) · **[미검증]** 일반 지식이나 관찰이며 출처 미확보 · **[제안]** 리서치를 근거로 한 내 설계 제안
> 참고: WebFetch는 ars-nova.com, brittenpearsarts.org, open.lib.umn.edu, daily.redbullmusicacademy.com에서 DNS 단계에서 막혔다. 그래서 대부분의 인용은 WebSearch 결과 스니펫에 근거한다. 원문 대조가 필요하면 해당 도메인을 허용해야 한다.

---

## 1. 머니코드 / 캐논 진행 계열

### 1-1. 주요 계열 (F장조 기준, 이 문서 전체의 기준 조성)

| 이름 | 로마 숫자 | F장조 예 | 성격 | 아늑함 적합도 |
|---|---|---|---|---|
| Axis / "4 Chords" | I–V–vi–IV | F–C–Dm–B♭ | 밝음, 팝 그 자체 | 중 (하모닉 리듬을 느리게 하면 ↑) |
| 50s / 두왑 | I–vi–IV–V | F–Dm–B♭–C | 다정함, 자장가·옛 노래 느낌 | **상** |
| Sensitive Female | vi–IV–I–V | Dm–B♭–F–C | 애틋함, 단조로 시작 | 상 (비·창가용) |
| 小室進行 (고무로) | vi–IV–V–I | Dm–B♭–C–F | 슬프지만 힘 있음 | 중 (드라마가 강함) |
| **캐논 (Pachelbel)** | I–V–vi–iii–IV–I–IV–V | F–C–Dm–Am–B♭–F–B♭–C | 고풍스럽고 단정함, 향수 | **최상 (원래 카논용으로 설계된 그라운드)** |
| 王道進行 (Royal Road) | IV△7–V7–iii7–vi | B♭△7–C7–Am7–Dm | 아련함, 그리움, J-pop 정서 | 상 (밤·노을) |
| 플라갈/자장가 [미검증·이론] | I–IV–I–V, I–IV 왕복 | F–B♭–F–C | 흔들림, 잠 | 최상 (졸림) |
| 차용 iv [미검증·이론] | IV–iv–I | B♭–B♭m–F | 향수, 노을 | 상 (태그·엔딩용) |

- I–V–vi–IV, vi–IV–I–V, I–vi–IV–V는 **같은 네 화음을 순환시킨 형태**다. 그래서 서로 다른 테마로 써도 섞였을 때 이질감이 적다. **[확인]** Wikipedia "I–V–vi–IV progression"에 Axis progression과 SFCP(vi–IV–I–V), '50s(I–vi–IV–V)가 같은 화음의 재배열로 정리돼 있다.
- 캐논 진행은 1960년대 재발견 이후 1970년대부터 팝에 대량 차용됐다. 1994년 무렵에는 작곡가들 사이에서 "클리셰"로 통했다. 짧게 줄이면 I–V–vi–IV가 된다. **[스니펫]** (Wikipedia "List of variations on Pachelbel's Canon")
- 왕도진행은 일본 역대 최다 판매 싱글 상위 20곡 중 40%(2023 기준)에 쓰였다. 성격은 "wistful(아련함)"로 묘사된다. **[스니펫]** (Wikipedia "Royal road progression")
- 고무로 진행은 "조금 슬프면서도 힘 있는" 진행으로 소개된다. **[스니펫]** (SoundHouse 블로그)

### 1-2. 왜 "익숙하게" 들리나
- **노출량**: 너무 흔해서 처음 듣는 곡도 '아는 곡'처럼 들린다. 반복 청취와 선호의 관계를 다룬 연구 결과는 이렇다. Madison & Schiölde(2017)는 복잡도와 상관없이 **반복할수록 선호가 단조 증가**한다고 보고했다. Chmiel & Schubert의 메타분석에서는 57개 연구 중 50개가 Berlyne의 **역U(너무 익숙하면 지루함)** 모형과 양립했다. **[스니펫]** 그래서 실무적 해석은 이렇다. *익숙한 화성으로 진입 장벽을 낮추고, 질림(tedium)은 루프 설계로 막는다.*
- **화성 재료**: 다장조 주요 3화음(I·IV·V)에 관계단조 vi(필요하면 iii)만 섞는다. 밝음과 애틋함이 한 루프 안에 같이 있다. **[미검증·이론]**
- **아늑함을 좌우하는 것은 진행보다 '하모닉 리듬'과 베이스 모양이다.** 화음이 1~2박 단위로 바뀌면 신나고, 2박 이상이면 차분하다. 캐논의 화음 하나는 2박이다. 베이스를 F–E–D–C–B♭–A–B♭–C(전위 사용)처럼 **순차 하행**으로 만들면 가장 부드럽다. **[제안]**

### 1-3. 저작권 (짧게 확인)
- 미국 제2순회항소법원은 2024-11-01 *Structured Asset Sales v. Sheeran* 사건에서 판결했다. **흔한 4화음 진행에 당김음 하모닉 리듬을 더해도 독창성 기준에 못 미쳐 보호되지 않는다**고 봤다. 같은 곡을 둘러싼 2023-05-04 배심 평결에서도 Sheeran이 이겼다. **[스니펫]** (Music Business Worldwide, WIPR 등)
- 정확히 말하면 "화성 진행은 절대 보호되지 않는다"는 판결은 아니다. *이 정도로 흔한 진행은 보호되지 않는다*는 판단이다. **멜로디(가락)·가사·고유한 리듬 조합은 여전히 보호 대상**이다. 그러니 진행은 자유롭게 쓰고 가락은 반드시 오리지널로 쓴다. (법률 자문이 아님. 한국도 가락 중심으로 실질적 유사성을 판단하는 경향이라고 알려져 있으나 **[미검증]**)
- 주의: 캐논 진행 위에서 3도·5도를 따라 **순차 하행하는 8음 선(F장조로 A–G–F–E–D–C–D–E)은 파헬벨 1바이올린 첫 선율 그 자체**다. 퍼블릭 도메인이긴 하지만 "오리지널"이 아니게 되고 즉시 '캐논'으로 인식된다. 이 선은 피한다(§2-3 참고).

---

## 2. 반복 진행 위에서 돌림노래(라운드/카논) 쓰는 법

### 2-1. 사례에서 뽑은 구조
- **파헬벨 캐논**: 2마디 8음 그라운드 베이스가 28회 반복된다. 바이올린 3대가 **같은 선율을 2마디 간격**으로 시작한다(1바이올린 3마디, 2바이올린 5마디, 3바이올린 7마디). 진입 간격이 **그라운드 한 주기와 정확히 같다**. **[스니펫]** (Wikipedia; piano-composer-teacher-london 분석) 선율은 4마디 단위 '변주' 묶음으로 진행하며 음가가 점점 잘게 쪼개진다. 그래서 어느 순간을 잘라 봐도 세 성부가 **서로 다른 리듬 밀도**에 있다. 이것이 질문에서 말한 "1성부 2분, 2성부 4분, 3성부 8분" 효과가 **카논 구조에서 저절로** 생기는 원리다. **[스니펫 + 미검증: 마디별 음가 순서는 악보 확인 필요]**
- **Frère Jacques**: 2마디 프레이즈 4개(각각 반복)로 되어 있고 2마디 간격으로 진입한다. 화성은 대부분 I이고 일부 V가 있다(토닉 하나만 쓰는 것은 아님). **[스니펫]** (Berklee "Writing a Canon", Wikipedia "Round") 프레이즈마다 **리듬(4분 → 2분 포함 → 빠른 8분 → 느린 저음 종소리)과 음역이 다르다**. 그래서 겹쳐도 각 성부가 따로 들린다. **[미검증·악보 관찰]**
- **Row, Row, Row Your Boat**: 4성부이고 2마디(6/8) 간격이다. 화성은 거의 I이다. **[미검증·일반 분석]**
- **한국 돌림노래("다같이 돌자 동네 한바퀴" 등)**: 돌림 형식으로 부르는지, 원곡이 무엇인지 검색으로 확인하지 못했다. **[미검증]** 같은 원리(짧은 프레이즈, 토닉 중심 화성, 일정 간격 진입)라고 가정하는 것이 안전하다.
- **Junichi Masuda(포켓몬)**: "NES는 3채널뿐이라 바흐의 **3성부 작품**을 많이 공부하며 그런 음악을 NES에서 어떻게 만들지 고민했다." **[스니펫]** (PocketMonsters.net 인터뷰) 2A03 = 대위법 3성부라는 발상의 근거다.

### 2-2. 핵심 규칙 (작곡 레시피)
1. **진입 간격 = 화성 주기(또는 그 정수배).** 그래야 모든 구간(세그먼트)이 *같은 화음열 위에* 놓인다. 화성을 반복하는 라운드의 정석이다. **[확인/스니펫]** (Wikipedia Round, ars-nova Q39, Britten Pears "A Round Britten": "모든 줄이 같은 화음 위에 맞아야 하므로 어긋나게 들어가도 맞는다")
2. **세그먼트를 하나씩 '세로로' 쓴다.** 먼저 A를 쓴다. 다음으로 A와 동시에 울릴 B를 쓰고, A·B와 동시에 울릴 C를 쓴다. 선율 전체를 먼저 쓰고 나중에 맞추는 방식이 아니다. **[스니펫]** (ars-nova Q39: "한 번에 한 세그먼트씩, 모든 성부를 함께 고려")
3. **강박(화음이 바뀌는 박) = 화성음만.** 약박의 비화성음은 경과음·보조음으로만 쓰고, 순차로 들어갔다가 순차로 나온다. **[제안 + 일반 대위법]**
4. **화음 구성음을 세그먼트별로 나눠 맡긴다.** 같은 슬롯에서 A는 3음, B는 근음·5음, C는 아르페지오를 맡는 식이다. 그러면 겹쳤을 때 자동으로 3화음이 완성되고 유니즌이 줄어든다. 동시 강박에서 두 성부가 같은 음이름이 되는 비율은 **≤25%**로 잡는다. **[제안]**
5. **리듬 밀도를 세그먼트마다 다르게 한다.** A는 2분·4분(2~3타/마디), B는 4분 중심(4~5타), C는 8분(6~8타), D는 쉼표가 많은 '숨' 구간(1~2타)이다. 카논이 돌면 어느 순간이든 느림·중간·빠름 층이 공존한다. **[제안, 파헬벨·Frère Jacques 구조에서 도출]**
6. **음역을 세그먼트마다 다르게 한다(유니즌 카논에서도 성부가 분리됨).** 같은 음높이로 하는 카논이어도 A는 높은 음역(C5–A5), B는 중간(G4–E5), C는 낮은-중간(C4–C5), D는 중간-높은(A4–F5)으로 나눈다. 그러면 동시에 울리는 성부들이 항상 다른 음역에 있다. 그리고 **빠른 세그먼트일수록 낮게, 긴 음일수록 높게** 둔다. 펄스파의 날카로움이 빠른 음표에 몰리지 않게 하려는 것이다. **[제안]**
7. **성부 사이 간격.** 강박에서는 3도·6도·10도를 우선한다. 완전5도·옥타브는 가끔만 쓴다. 강박의 2도·7도·트라이톤(F장조에서는 B♭–E)은 금지한다. 리듬이 서로 다르면 병행 5도·8도는 자연히 드물어진다. **[일반 대위법]**
8. **선율 윤곽.** 대부분 순차로 진행한다. 도약은 5도 이내로, 마디당 1회까지 허용하고, 도약 뒤에는 반대 방향으로 순차 회복한다. 세그먼트 윤곽은 아치형이나 완만한 하행으로 만든다(진정 효과, §3-4).
9. **이음매.** 각 세그먼트의 마지막 음은 같은 성부의 다음 세그먼트 첫 음으로 순차 연결한다. **D→A 이음매가 곧 루프 이음매**다. D는 V(C) 위에서 2음(G)이나 7음(E)으로 끝내서 A의 첫 음(1·3음)으로 해결되게 한다.
10. **기계 검증(코드로 할 일을 산문으로).** 16분음 그리드마다 동시에 울리는 모든 성부 쌍의 음정을 12로 나눈 나머지로 계산한다. 강박에서 {1, 2, 6, 10, 11}(반음·온음·트라이톤·7도)이 나오면 표시한다. 세그먼트 조합 쌍(A+B, A+B+C, B+C+D, C+D+A, D+A+B)을 모두 렌더해서 귀로도 확인한다. 라운드는 결국 "귀로 테스트"다. **[스니펫]** (ars-nova: "많은 라운드가 대위법에 느슨하다")
11. **'숨'을 넣는다.** 3성부가 쉬지 않고 연주하면 아늑함이 사라진다. Totaka: "**소리와 소리 사이의 공간**을 빚는 것을 가장 중요하게 여겼다." **[확인/스니펫]** (Billboard) 세그먼트 D(성긴 구간)는 카논 안에서 계속 돌기 때문에 **항상 한 성부는 쉬는 상태**가 된다.

### 2-3. 캐논 진행(F장조) 슬롯 표: 강박에 쓸 수 있는 음

| 슬롯 | 1a | 1b | 2a | 2b | 3a | 3b | 4a | 4b |
|---|---|---|---|---|---|---|---|---|
| 화음 | F | C | Dm | Am | B♭ | F | B♭ | C |
| 구성음 | F A C | C E G | D F A | A C E | B♭ D F | F A C | B♭ D F | C E G |
| 다음과 공통음 | C | – (순차 이동) | A | – | F | F | – | C(루프) |

- 공통음을 **붙잡는 선**(예: 1a→1b에서 C 유지, 2a→2b에서 A 유지, 3a→3b→4a에서 F 유지)은 파헬벨의 하행 음계선과 다른, 원곡과 겹치지 않는 "머무는" 아늑한 모양을 만든다. 세그먼트 A(긴 음)에 특히 잘 맞는다. **[제안]**
- 화성 변주가 필요하면 **두 음이 공통인 화음으로만** 바꾼다(F↔Dm, F↔Am, C↔Em). 그러면 강박 음이 공통음인 한 카논 협화가 유지된다. 카논 선율은 그대로 두고 **베이스와 반주만 바꾸는 것이 가장 안전한 변주**다. **[제안]**

---

## 3. 루프 피로(listener fatigue) 연구: 아늑한 게임들은 어떻게 하나

### 3-1. 게임·작곡가별 근거

| 게임/작곡가 | 확인된 기법 | 등급 |
|---|---|---|
| **동물의 숲 / Kazumi Totaka** | 매시 정각마다 바뀌는 24곡 체계가 있다. NH에서는 **오프닝 테마 선율이 모든 시간대 곡에 형태를 바꿔 들어가고 효과음에도 쓰인다**. "소리 사이의 공간"을 가장 중시했다. 비가 오면 시간대 곡이 '비 버전'(가벼운 방울 소리 추가)으로, 눈이 오면 썰매방울 섞인 버전으로 바뀐다(Nookipedia). | [스니펫] Billboard, Nookipedia |
| **Minecraft / C418** | "처음엔 음악을 가능한 한 적게 틀어야 한다고 생각했다(거슬릴 테니까). 그런데 **사이의 멈춤이 실제로 도움이 됐다**." 음악은 무작위 간격(약 10~20분, 출처마다 15분 또는 15~20분)으로 나오고, 언제 돌아올지 알려 주지 않는다. 피아노 중심의 성긴 앰비언트로, 음악을 '기능적 도구'로 봤다. | [스니펫] RBMA 2015, PCGamesN, Kill Screen |
| **Stardew Valley / ConcernedApe** | 아침에 한 곡을 **끝까지 한 번 재생한 뒤 멈춘다**. 정오 이후에는 새로 시작하지 않는다. 밤에는 자연음으로 바뀌고, 비 오는 날은 BGM 없이 **비 효과음 루프만** 깐다(플레이어 관찰). 계절마다 다른 곡을 둔다(NPR). 수면용 재즈 편곡 앨범 *Prescription for Sleep*은 Barone가 직접 곡을 골랐다(같은 선율을 느리고 성기게 바꾼 '잠 버전'의 선례). | [스니펫] 공식 포럼(팬 관찰), NPR, RPGFan |
| **A Short Hike / Mark Sparling** | 지역과 이동 방식에 따라 **선율 레이어와 앰비언트 레이어를 조합**한다(날씨에도 반응). "계속 움직이게 하는 동력과 함께, 쉬어 갈 **숨 쉬는 주머니(pockets)**"를 넣었다. 디지털 앨범에는 게임보이 편곡판도 있다. | [스니펫] Edge "Making Of", Wikipedia |
| **Celeste / Lena Raine** | 작업의 대부분은 곡을 "동적으로 만드는 일"이었다. 조용히 시작해서 레이어를 쌓는 구조다(예: *Resurrections*는 피아노 솔로에서 칩튠 아르페지오, 베이스, 퍼커션 순으로 쌓인다). | [스니펫] gamemusic.net, Game Audio Lookout |
| **Undertale / Toby Fox** | *Home*은 *Once Upon a Time*과 같은 선율을 쓴다. 집이라는 장소 = 이미 들은 주제의 다정한 재편곡이다. | [스니펫] Undertale Wiki |
| **네코아츠메 (Hit-Point, 작곡 Ryo Shintani)** | 눈 이벤트 때 **평소 BGM의 오르골 버전**으로 바꾼다. 2편에서는 BGM을 골라 바꿀 수 있다("As Usual", "Strolling Neko"). | [스니펫] Wikipedia, Fandom |
| **여행 개구리 (旅かえる, Hit-Point)** | BGM과 효과음 볼륨을 따로 조절할 수 있다. 작곡가와 음악 구조는 확인하지 못했다. | [스니펫] GadgetMatch / [미검증] |
| **포켓몬 / Junichi Masuda** | 채널 제약을 3성부 대위법으로 풀었다(§2-1). 마을 테마별 루프 길이는 확인하지 못했다. | [스니펫] / [미검증] |
| **MOTHER / Hirokazu Tanaka** | 같은 효과음을 반복하는 대신 **미세한 변형**을 만들었다(반복 회피를 SFX 단위로까지 적용). | [스니펫] Wikipedia "Hirokazu Tanaka" |
| 다마고치, 커비 | 출처를 확보하지 못했다. 다마고치는 피에조 비프음과 짧은 징글 위주라 '상시 BGM 없음'이 기본으로 알려져 있다. | [미검증] |

### 3-2. 일반 연구·실무 문헌
- **루프가 짧을수록 대비를 만들기 어렵고 쉽게 지루해진다.** 해결책은 곡 안에서 분위기를 교대(긴장 → 부드러움)하는 것이다. **[스니펫]** (Game Developer "Rethinking the audio loop in games")
- 2분짜리 필드 루프라면 새 곡이 나오기 전까지 같은 선율을 30번 넘게 듣게 될 수 있다. **[스니펫]** (Game Developer, BotW 분석)
- Winifred Phillips: 선형 루프의 목표는 *루프임을 숨기는 것*이고, **루프가 길수록 반복을 숨기기 쉽다**. 수직 레이어링은 "진행감 표시"와 "반복감 방지에 필요한 다양성"을 동시에 준다. 수평 재배열(세그먼트 셔플)도 반복감을 줄인다. 둘을 섞은 하이브리드가 가장 좋다. **[스니펫]** (Phillips GDC 2021 연재, FH Wedel 세미나 논문)
- Berndt, Dachselt & Groh(Audio Mostly 2012): 반복을 숨기는 기법을 구조적 확산(작곡), 자동 편곡, 생성적 변주, 표현적 연주로 분류한다. "완전 고정"도 "완전 무작위"도 답이 아니다. 플레이어가 **설정에서 음악을 꺼 버리는** 사례도 언급한다. **[스니펫]**
- Worrall(2024, JSMG): 청취 피로는 노출이 늘수록 감상과 즐거움이 줄어드는 관계다. 사람마다 내성 차이가 크다(어떤 작곡가는 3회 루프부터 짜증이 난다고 함). **[스니펫]**
- **귀벌레(earworm) 특징**(Jakubowski et al. 2016, 3,000명): 더 **빠른 템포**, **흔한 전체 윤곽**(상승 후 하강), **특이한 음정 구조**(예상 밖 도약, 평균보다 많은 동음 반복)가 있다. 그러니 '거슬리는 훅'을 피하려면 *느린 템포, 순차 진행, 동음 연타와 특이 도약 회피*가 필요하다. 익숙한 윤곽은 유지해도 된다. **[스니펫]** (APA 보도자료, Goldsmiths)
- **템포와 이완**: Bretherton et al.(2019, n=58)에서는 60 bpm 구간이 부교감 지표 상승과 연관됐다. 70~80 bpm 느린 음악이 심박과 혈압 감소와 연관됐다는 관찰 연구도 있다(통제가 약함). "60~80 bpm이 심박을 맞춘다"는 대중적 주장은 근거가 약하다. **[스니펫]**
- **자장가 특성**: 아기에게 부르는 노래는 더 높고 더 느리다(Trainor). 문화권이 달라도 자장가를 식별할 수 있다(Trehub 1993, Nature HB 2022). 진정시키는 말투는 **좁은 음역과 평탄하거나 하행하는 윤곽**을 쓴다. 자장가 자체의 하행 윤곽은 직접 확인하지 못했다. **[스니펫]**

### 3-3. 구체 기법 정리 (수치는 [제안], 근거 줄 표시)

| 기법 | 권장값 | 근거 |
|---|---|---|
| 루프 핵심 길이 | 한 바퀴 ≈ 45–60 s, *정확히 같은 오디오가 다시 나오는 주기*는 ≥ 3 min | Phillips(길수록 숨김), Game Dev(짧은 루프는 대비 부족) |
| 형식 | 패스 단위 A A A′ B(=AABA 계열), 브리지 B는 다른 진행 | Game Dev(분위기 교대) |
| 인트로 | 세션 첫 재생 때만. 루프에는 넣지 않음 | 실무 관례 [미검증] |
| 침묵 | 한 사이클(≈3.5분) 뒤 20–90 s 무작위 침묵(비 SFX만) | C418 "멈춤이 도움", Stardew 1회 재생 후 정지 |
| 레이어 | 패스마다 성부와 반주 가감(수직 레이어링) | Sparling, Raine, Phillips |
| 공유 모티프 | 모든 서브테마와 귀가 징글에 메인 모티프를 넣고 편성만 바꿈 | Totaka(Billboard), Undertale Home |
| 상태 변주 | 날씨와 시간대는 '같은 곡의 다른 옷'(비: 얇은 음색, 눈: 오르골) | 동숲 비·눈 버전, 네코아츠메 눈 오르골 |
| 템포 | 낮 76–88, 밤 66–72, 졸림 56–63 BPM | Bretherton, earworm(빠를수록 귀벌레) |
| 하모닉 리듬 | 화음당 ≥ 2박 | [제안] |
| 음역 | 선율 F4–A5 중심. C6 이상 지속음 금지. 빠른 음형은 낮게 | 펄스파 배음 [제안] |
| 훅 | 동음 연타·특이 도약·당김 반복 리프 금지. 짧은 동기는 변형하며 재등장 | Jakubowski 2016 |
| 볼륨 | BGM은 SFX보다 6–10 dB 낮게, 별도 슬라이더 제공, 기본값 중간 이하 | 여행 개구리 별도 슬라이더, Berndt(음악 끄는 플레이어) [수치는 제안] |
| SFX 반복 | 같은 이벤트음은 2–3 변형으로 미세 변주 | Hirokazu Tanaka |

---

## 4. 추천 레시피: 메인 테마 "뽈뽈 돌림노래"

### 4-1. 기본 사양
- **조성 F장조**: 펄스 선율이 F4–A5에 편하게 들어간다. 트라이앵글 베이스 F1–C3(약 44–131 Hz). 관계단조 Dm, IV조 B♭가 서브테마와 공유된다.
- **4/4, 80 BPM**: 1박 0.75 s, 1마디 **3.0 s**로 합성 계산이 깔끔하다. 허용 범위는 76–84.
- **진행(그라운드) = 캐논 진행, 화음당 2박, 4마디 = 12 s 주기**

| 마디 | 1–2박 | 3–4박 |
|---|---|---|
| 1 | F (I) | C (V) |
| 2 | Dm (vi) | Am (iii) |
| 3 | B♭ (IV) | F (I) |
| 4 | B♭ (IV) | C (V) |

  - 베이스 변주 ①: 근음 F–C–D–A–B♭–F–B♭–C (파헬벨형 4도 하행 + 2도 상행)
  - 베이스 변주 ②: 전위 F–E(C/E)–D–C(Am/C)–B♭–A(F/A)–B♭–C (**순차 하행**, 가장 아늑함)
  - 베이스 변주 ③: ②에 약박 8분 경과음 추가(패스 3용)
- **선율 = 4마디 세그먼트 4개(A·B·C·D) = 16마디 = 48 s.** 각 세그먼트가 그라운드 한 주기 위에 놓인다(진입 간격 4마디 = 12 s).
  - A "노래": 2분과 4분, C5–A5, 공통음을 붙잡는 선, 2~3타/마디. **첫 2마디 = 게임 전체 모티프**
  - B "걸음": 4분 중심에 8분 약간, G4–E5, 아치 윤곽
  - C "뽈뽈": 8분 분산화음과 음계, C4–C5(낮게, 볼륨 −2 dB)
  - D "숨": 1~2타/마디, 쉼표 위주, A4–F5, C 화음 위 G나 E로 끝나 A로 돌아감

### 4-2. 채널 배치와 카논 진입 타임라인 (총 68마디 = 204 s ≈ 3분 24초)

채널: **V1 = pulse1(듀티 50%, 둥글고 기준 음량)**, **V2 = pulse2(듀티 25%, −4 dB, 살짝 오른쪽 팬)**, **V3 = pulse3 가상 채널(듀티 12.5%, −8 dB, 한 옥타브 위, 왼쪽 팬)**, **TRI = 그라운드 베이스**, **NOI = 롱모드 노이즈(쉿 소리) 아주 작게**.
(엄격한 2A03만 쓰려면 V3를 빼거나, 마디 41–56에서 TRI가 그라운드 대신 A·B·C·D를 2옥타브 아래로 연주해 3성부 카논을 만든다. 3번째 펄스는 VRC6 확장칩이 펄스 2개를 더한 전례가 있어 NES풍을 해치지 않는다. **[미검증·일반 지식]**)

| 마디 | 구간 | V1 p1 50% | V2 p2 25% | V3 p3 12.5% 8va | TRI | NOI |
|---|---|---|---|---|---|---|
| i1–i4 | 인트로(세션 첫 1회) | – | 마디 첫 박 점음 1개씩 | – | 그라운드① | 비 앰비언트 |
| 1–16 | 패스1 "혼자" | A B C D | – | – | ① 2분음 | – |
| 17–32 | 패스2 "둘이" | A B C D (꾸밈음 추가) | 17–20 쉼 → **21부터 A** B C | – | ② 순차 하행 | – |
| 33–48 | 패스3 "다같이" | A(8va) B C D | D A B C | 33–40 쉼 → **41부터 A** B | ③ 경과음 | 2·4박 아주 작은 틱 |
| 49–56 | 빠짐(드레인) | – | D(49–52) → 끝 | C D → 끝 | ① | 페이드 |
| 57–64 | 브리지 B | 자유 선율, 성기게(듀티 12.5%로 전환) | – | – | 왕도진행 근음 | – |
| 65–68 | 꼬리 | A의 모티프 2마디만, 그 뒤 쉼 | – | – | F 온음표 → C | – |
| → | **침묵 20–90 s(무작위)** 후 패스1부터 재시작(인트로 생략) | | | | | |

- 확인: 마디 41–44에서는 V1=C, V2=B, V3=A이고, 45–48에서는 D, C, B다. 모든 수직 조합이 §2-2 규칙 10의 검증 대상이다.
- 브리지 B(8마디, 24 s, 왕도진행): `B♭△7 | C | Am7 | Dm7 | B♭△7 | C | Gm7 | Csus4→C`. 카논을 쉬고 분위기를 교대한다(AABA의 B). C로 끝나서 F(패스1)로 강하게 돌아온다.
- **정확히 같은 오디오의 반복 주기**는 204 s에 침묵을 더한 값이다. 사이클 하나가 약 4~5분이고, 핵심 선율 한 바퀴는 48 s다.

### 4-3. 루프마다 변주 넣는 법 (카논 선율은 고정하고 '옷'만 바꾼다)
1. **수직 레이어**: 패스1→2→3에서 성부가 늘고 드레인에서 줄어든다(위 표). 사이클 안에서 질감이 계속 변한다.
2. **반주 변주**: 베이스 ①②③, 노이즈 유무, V2의 유니즌/옥타브 아래 선택. 카논 협화를 건드리지 않는 안전한 변주다.
3. **하루 시드 변주**(게임의 시드 하루 리듬과 연동): 세그먼트 D 대안 2종, 패스2 꾸밈음 on/off, V2 옥타브, 템포 ±2 BPM, 사이클 첫 성부를 V1 또는 V2로 선택. 오프라인 렌더라면 **채널별 스템**(TRI, P1, P2, P3, NOI, 68마디 같은 격자)과 대안 스템을 OGG로 렌더해서 런타임에 섞는 방식을 권한다(Phillips 하이브리드). 아니면 완성본 3종을 렌더해 셔플한다.
4. **NES식 에코**: V2가 비어 있는 패스1에서 pulse2가 V1을 점8분 늦게, −9 dB, 12.5%로 따라 하게 한다(초미니 카논이자 잔향 대용). **[미검증·칩튠 관례]**
5. **음색 미세 변주**: 긴 음에만 지연 비브라토(±10–15 cent, ~5 Hz, 0.3 s 뒤 시작)를 건다. 어택 5–10 ms의 부드러운 엔벨로프로 펄스의 날을 깎는다. **[제안]**
6. **트리거**: 상시 루프 대신 *출발, 귀가, 방에 들어옴* 같은 이벤트에서 사이클을 시작한다. 사이클이 끝나면 침묵에 비 SFX만 남긴다(Stardew, Minecraft 방식).

### 4-4. 서브테마 (같은 F장조 계열이라 크로스페이드해도 어울림)
공통 규칙: **메인 모티프(A의 첫 2마디)를 모든 서브테마에 변형해서 넣는다**(Totaka 방식). 귀가와 포스터 걸기 징글도 이 모티프의 4~5음으로 만든다. 템포가 달라도 마디 경계에서 2–3 s 크로스페이드하면 된다.

| 테마(게임 상태) | 조성/모드 | 진행 (1화음/마디, ×2) | BPM·박자 | 편성 | 근거 |
|---|---|---|---|---|---|
| **비·가랑비** (rain/drizzle, stay_home 빗방울 세기) | D단조(F의 관계단조) | `Dm | B♭ | F | C` (vi–IV–I–V) | 72, 4/4 | p 12.5% 하나 + TRI + 롱노이즈 극소. 기본 날씨가 비라면 **메인 테마의 '비 버전'**(V3 제거, 전부 12.5%, −3 dB)을 기본으로 쓰고 이 곡은 창가 장면 전용으로 | 동숲 비 버전, 같은 4화음 순환 |
| **밤** (19–6시, 별, 반딧불) | F장조, 왕도진행 | `B♭△7 | C7 | Am7 | Dm7 | B♭△7 | C7 | Gm7 | C` | 66–72, 4/4(또는 12/8 흔들림) | TRI + p 50% 낮은 음역 + p 12.5% 2옥타브 위 '별' 아르페지오 드문드문 | 왕도진행의 아련함 |
| **호기심/경이** (curious, wild, door_out, sky) | F 리디안(B♮ 차용) | `F | G/F | F | G/F | Dm | C/E | B♭ | Csus4–C` | 92–100, 4/4 스타카토 | p 25% 짧은 음 + TRI F 페달 | I–II 리디안 '경이'는 이론 관례 [미검증] |
| **졸림/잠듦** (sleep, wrap_up → 잠듦) | F장조(또는 B♭장조로 4도 아래 더 어둡게) | `F | B♭/F | F | C/E | Dm | B♭ | F/C | C–F` (F 페달 위 플라갈 흔들림) | 56–63, **3/4** | **오르골**: p 12.5%, 빠른 감쇠(~0.4 s), 2옥타브 겹침 + TRI 온마디 | 자장가 연구(느림, 좁은 음역), 네코아츠메 오르골, Prescription for Sleep |
| 눈 (1–2월) | 메인 그대로 | 메인 캐논 | −10% (72) | 오르골 음색 + 노이즈 대신 '방울' 짧은 하이 펄스 | 네코아츠메 눈 오르골, 동숲 썰매방울 |
| 노을 태그 (17–19시) | F장조 | `B♭ | B♭m | F` (IV–iv–I) 2–4마디 꼬리 | 메인과 동일 | 메인 패스 끝에 붙임 | 차용 iv 향수 [미검증·이론] |

---

## 출처 (Sources)
- Billboard, Kazumi Totaka 이메일 인터뷰(NH 음악, "소리 사이의 공간", 오프닝 선율의 시간대별 재사용): https://www.billboard.com/culture/lifestyle/animal-crossing-composer-new-horizons-music-interview-9390953/
- Arkansas Democrat-Gazette via PressReader(Totaka 2020): https://www.pressreader.com/usa/arkansas-democrat-gazette/20200531/283820035807683
- Nookipedia Rain / Snow(시간대 곡 비·눈 버전): https://nookipedia.com/wiki/Rain , https://nookipedia.com/wiki/Snow
- Red Bull Music Academy, C418 인터뷰 2015("the pause in between actually helps"): https://daily.redbullmusicacademy.com/2015/08/c418-interview
- PCGamesN, C418 프로필(15분 간격, "confusion"): https://www.pcgamesn.com/minecraft/sssssss-boom-inside-c418-gleeful-childlike-personality-behind-every-noise-minecraft
- Kill Screen, "The quiet importance of the Minecraft soundtrack": https://www.killscreen.com/quiet-importance-minecraft-soundtrack/
- Stardew Valley 공식 포럼(음악 재생 규칙, 플레이어 관찰): https://forums.stardewvalley.net/goto/post?id=156731 · Steam 토론: https://steamcommunity.com/app/413150/discussions/0/405692758715197154
- NME, Eric Barone 인터뷰: https://www.nme.com/features/gaming-features/stardew-valley-eric-barone-concernedape-interview-orchestra-tour-haunted-chocolatier-3550713
- Connecticut Public/NPR, Barone 2024: https://www.ctpublic.org/2024-12-19/the-creator-of-video-game-stardew-valley-talks-its-legacy-and-future
- RPGFan, Prescription for Sleep: Stardew Valley: https://www.rpgfan.com/feature/prescription-for-sleep-stardew-valley-interview-with-the-musicians-and-producers/
- Edge "The Making Of… A Short Hike"(PressReader): https://www.pressreader.com/australia/edge/20200813/281556588171738 · Wikipedia A Short Hike: https://wikipedia.com/wiki/A_Short_Hike · Bandcamp Daily(Mark Sparling): https://daily.bandcamp.com/high-scores/high-scores-mark-sparling
- gamemusic.net, Lena Raine: https://gamemusic.net/?p=4506 · Game Audio Lookout(Celeste): https://medium.com/game-audio-lookout/enhancing-gameplay-with-music-in-celeste-5da210bbc602 · icancompose(Resurrections): https://www.icancompose.com/inspiration/synth-landscapes/
- Undertale Wiki, Home: https://undertale.wiki/w/Home%20(soundtrack)
- Wikipedia Neko Atsume: https://en.wikipedia.org/wiki/Neko_Atsume · Neko Atsume Wiki: https://nekoatsume.fandom.com/wiki/Neko_Atsume_2
- Wikipedia Travel Frog: https://en.wikipedia.org/wiki/Travel_Frog · GadgetMatch: https://www.gadgetmatch.com/how-to-play-travel-frog
- PocketMonsters.net, Junichi Masuda 인터뷰(바흐 3성부): https://www.pocketmonsters.net/content/Interview_A_Conversation_with_Pokemons_Musical_Maestro
- Wikipedia Hirokazu Tanaka: https://en.wikipedia.org/wiki/Hirokazu_Tanaka
- Wikipedia I–V–vi–IV progression: https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression
- Wikipedia Royal road progression: https://en.wikipedia.org/wiki/Royal_road_progression
- SoundHouse(王道進行·小室進行): https://www.soundhouse.co.jp/contents/staff-blog/index?post=891
- Wikipedia List of variations on Pachelbel's Canon: https://en.wikipedia.org/wiki/List_of_variations_on_Pachelbel%27s_Canon · Pachelbel's Canon: https://wikipedia.com/wiki/Canon_in_D
- Pachelbel's Canon in D – Complete Analysis: https://www.piano-composer-teacher-london.co.uk/pachelbel-s-canon-in-d-complete-analysis/
- Classic FM, "Pachelbel's Canon might not actually be a canon": https://amp.classicfm.com/composers/pachelbel/canon-unexpected/
- Music Business Worldwide(Sheeran 항소 판결): https://www.musicbusinessworldwide.com/ed-sheeran-beats-thinking-out-loud-copyright-appeal/ · WIPR: https://worldipreview.com/copyright/ed-sheerans-thinking-out-loud-hits-the-right-note-in-court-win · Al Jazeera(2023 평결): https://www.aljazeera.com/news/2023/5/5/very-happy-ed-sheeran-wins-thinking-out-loud-copyright-case
- Wikipedia Round (music): https://en.wikipedia.org/wiki/Round_(music)
- ars-nova Q39 "What are the rules for writing a round?": https://ars-nova.com/Theory%20Q&A/Q39.html
- Berklee "The Woodshed: Writing a Canon": https://www.berklee.edu/node/2408656
- Britten Pears Arts "A Round Britten – How to write a round": https://brittenpearsarts.org/friday-afternoons/resource/a-round-britten-how-to-write-a-round
- mymusictheory "Writing a simple canon": https://mymusictheory.com/composition/writing-a-simple-canon/
- Game Developer "Rethinking the audio loop in games": https://www.gamedeveloper.com/audio/rethinking-the-audio-loop-in-games
- Game Developer "Breaking the loop (BotW)": https://gamedeveloper.com/audio/breaking-the-loop-a-look-at-the-cinematic-music-of-breath-of-the-wild
- Winifred Phillips, GDC 2021 연재(수직 레이어링·수평 재배열·하이브리드): https://www.gamedeveloper.com/blogs/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021- , https://gamedeveloper.com/audio/horizontal-resequencing-and-song-structure-for-game-music-composers-from-spyder-to-sackboy-gdc-2021- , https://www.gamedeveloper.com/game-platforms/hybrid-horizontal-vertical-structure-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-
- FH Wedel 세미나 논문(Stobbe, 반복 피로): https://intern.fh-wedel.de/fileadmin/mitarbeiter/iw/Lehrveranstaltungen/2019WS/Seminar/Ausarbeitung11_Stobbe.pdf
- Berndt, Dachselt, Groh, "A Survey of Variation Techniques for Repetitive Games Music"(Audio Mostly 2012, doi:10.1145/2371456.2371466): https://mt.inf.tu-dresden.de/en/research/publications/a-survey-of-variation-techniques-for-repetitive-games-music
- Devon Thome, "Game 101: Reducing Music Fatigue": https://world.hey.com/thome/game-101-reducing-music-fatigue-d0214e31
- Worrall, PhD thesis 2025 / JSMG 2024(청취 피로): https://etheses.whiterose.ac.uk/id/eprint/38684/
- APA 보도자료(Jakubowski et al. 2016, 귀벌레): https://www.apa.org/news/press/releases/2016/11/earworms · Goldsmiths 리포지토리: https://research.gold.ac.uk/19405
- Bretherton et al. 2019, *Music & Science*(템포와 자율신경): https://eprints.whiterose.ac.uk/147645/
- Vijayaraman & Ramadoss 2019(70–80 bpm): https://www.journalofsports.com/archives/2019/vol4/issue1/4-1-7
- Madison & Schiölde 2017(반복과 선호): https://pmc.ncbi.nlm.nih.gov/articles/PMC5374342 · Hargreaves 1984: https://Www.Gwern.net/doc/psychology/novelty/1984-hargreaves.pdf
- Trainor & Zacharias 1998 / Trehub 1993(자장가·영아 지향 노래): https://trainorlab.mcmaster.ca/publications/pdfs/trainor_zacharias_1998.pdf , https://trainorlab.mcmaster.ca/publications/pdfs/1993_Trehub.pdf · Nature Human Behaviour 2022: https://www.nature.com/articles/s41562-022-01410-x
- NESdev APU Triangle(볼륨 제어 없음): https://nesdev.org/wiki/APU_Triangle · NESdev 2A03: https://nesdev.org/wiki/2A03 · vgmrips NES APU(듀티 12.5/25/50/75%): https://vgmrips.net/wiki/NES_APU · NESdev VRC6 audio: https://www.nesdev.org/wiki/VRC6_audio
