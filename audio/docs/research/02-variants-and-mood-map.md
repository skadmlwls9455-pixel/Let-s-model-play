# 02 · 하나의 사운드트랙으로 변주하기: 날씨·시간·장소·기분 매핑

> 범례: **[S#]** 아래 출처 번호 · **[2차]** 팬위키·리뷰·검색 요약 등 2차 자료 · **[추정]** 사례와 연구에서 끌어낸 설계 추론(검증 안 됨) · **[미확인]** 찾지 못했거나 기억에만 근거함.
> 조사 한계: 이 세션에서 WebFetch가 scalar.usc.edu, stardewvalleywiki.com, pmc.ncbi.nlm.nih.gov, frontiersin.org를 열지 못했다. 그래서 해당 논문과 위키는 **검색 결과 요약**에 기대어 정리했다. 수치를 인용하기 전에 원문과 대조할 것.
> 다른 문서와의 관계: 메인 테마(F장조, 80 BPM, 캐논 그라운드, 모티프 M = 세그먼트 A의 첫 2마디)는 **01-theme-and-loops.md**를 그대로 따른다. 렌더, 루프, 라우드니스(BGM −18 LUFS)는 **03-chiptune-synthesis.md**를 따른다. 이 문서는 그 위에 얹는 **변주 체계**만 다룬다.

---

## 0. 결론 먼저

- **홈 키는 F장조**(A4 = 440)다. 01 문서와 같다. F를 고른 결정적 이유는 5도권의 이웃 두 집합이 게임의 축과 맞물린다는 점이다.
  - **C쪽(♮, 한 칸 밝음)**은 *밖·낯선 곳·경이*를 맡는다. door_out, wild, sky, sounds가 여기 속한다.
  - **B♭쪽(2♭, 한 칸 따뜻함)**은 *집·사람·잠·노을*을 맡는다. 집과 사람, 자장가, 노을이 여기 속한다.
  - 펄스 선율은 F4–A5, 베이스는 F2–C4가 편하다(폰 스피커를 고려한 값, 03 문서).
  - C장조를 홈으로 삼아도 원리는 같다. 다만 "밝은 이웃"이 G장조(F♯)가 되어 합성 표기가 조금 번거로워진다.
- **구조 권장안: BGM 16곡, 오디오 파일 20–24개(스템 2묶음이면 20개).** 날씨는 레이어로, 기분은 징글로 처리한다.
  - **풀 편곡 트랙**: 집 테마의 시간대 편곡 4곡(새벽, 낮, 노을, 밤). 각 곡을 스템 2–3개로 렌더한다. 날씨와 등불 진행은 이 스템을 섞어서 만든다.
  - **수평 전환 루프**: 장소 테마 10곡(9개 코너 + door_out). 각 16마디이고 마디선에서 전환한다. slow_room은 **파일을 따로 만들지 않는다**. 집 테마 core 스템을 `playbackRate = 2/3`으로 재생하면 완전5도 아래 B♭장조, 53 BPM이 된다. letter_room은 BGM 없이 앰비언스와 2음 스팅어만 쓴다.
  - **기타 루프**: 자장가 1곡, 창가 비 장면용 D단조 1곡(01 문서 §4-4).
  - **무박(free-time) 레이어 4개**와 **앰비언스 4개**: 빗방울, 눈 방울종, 별 반짝·반딧불, 겨울 차임 / 비, 가는 비, 눈 정적, 여름밤.
  - **징글**: 기분 4개와 잠들기 1개, 이벤트 스팅어 약 10개. 각 0.3–6 s.
- **일관성 3대 규칙**
  1. **하나의 모티프와 하나의 그라운드.** 모든 BGM과 징글은 모티프 M과 캐논 진행 4화음(F–C–Dm–B♭)을 이조, 회전, 확대, 축소, 재박하여 만든다. 키르비의 Green Greens나 셀레스트 B-side처럼 동기만 같으면 스타일이 달라도 한 곡으로 들린다 [S14][S19].
  2. **한 음 규칙과 펜타 규칙.** 모든 곡은 F장조 음집합에서 5도권으로 한 칸 이내(B♭ / F / C 집합)에 머문다. 홈과 다른 음은 최대 하나다. 빗방울, 종, 반짝이, 징글 선율은 **F 펜타토닉(F G A C D)**만 쓴다. 이 다섯 음은 세 집합 모두에 들어 있으므로 어떤 곡 위에 얹어도 부딪히지 않는다. 문어의 반응 징글은 언제나 F로 해결한다("문어의 목소리 = F").
  3. **같은 악기 팔레트, 정해진 전환 문법.** 모든 곡이 같은 채널 정의(01 §4-2), 같은 가짜 에코, 같은 라우드니스를 쓴다. 날씨는 곡을 바꾸지 않는다. 드럼을 **빼고**, 빗방울을 **얹고**, 필터를 내릴 뿐이다(Totaka 원칙 [S3]). 장소는 마디선에서, 시간대는 프레이즈 끝과 종소리에서, 날씨는 4–12 s 램프로 바뀐다.

---

## 1. 게임들은 어떻게 하나의 사운드트랙을 변주하나

### 1.1 기법 세 가지와 하나 더
| 기법 | 원리 | 장점 | 비용과 위험 | 대표 사례 |
|---|---|---|---|---|
| **수직 레이어링** | 같은 길이·템포의 스템을 동시에 돌리고 볼륨만 바꾼다 | 조합 폭발 없이 상태 수를 늘린다. 전환이 매끄럽다(박이 항상 맞음) | 조성, 템포, 화성은 바꿀 수 없다. 스템 수만큼 디코딩 메모리가 든다 | A Short Hike, Celeste, AC:NH 비(퍼커션 제거) [S4][S18][S19] |
| **수평 재배열** | 루프나 세그먼트를 마디·프레이즈 경계에서 갈아 끼운다 | 상태마다 성격이 완전히 달라도 된다 | 전환 지연이 생긴다(최대 1마디). 경계 설계가 필요하다 | OoT 하이랄 평원 8마디 조각, Minecraft 바이옴 풀 [S9][S10][S21] |
| **완전 재편곡** | 같은 선율을 다른 선법, 템포, 악기로 새로 쓴다 | 표현력이 가장 크다. "같은 노래, 다른 하루"가 된다 | 상태 수 × 곡 수만큼 파일이 늘어난다 | AC 시간별 곡의 비·눈 버전, 포켓몬 DPPt 낮·밤 [S1][S2][S16] |
| *무박 레이어(덧)* | 박과 무관한 드문 음(펜타)을 랜덤하게 흩뿌린다 | 동기화가 필요 없고 어떤 곡에도 맞는다 | 밀도가 높으면 산만하다 | AC NL 비 버전의 "링잉" 음, NH 눈 버전의 썰매방울 [S1][S2][2차] |

### 1.2 사례별 요점
| 게임 | 무엇을 바꾸나 | 어떻게 바꾸나 | 우리에게 주는 교훈 |
|---|---|---|---|
| **튀어나와요 동물의 숲 NL / 모여봐요 NH** | 시간(24곡) × 날씨 | NH는 시간별 곡마다 맑음·비·눈 세 버전이 있다 [S6][2차]. 비 버전에서는 드럼이 빠지고 마림바가 베이스를 맡는다. Totaka: *"비를 표현하는 편곡이 아니라, 빗소리를 돋보이게 할 음악을 생각했다"* [S3]. gamemusic.net은 이를 "비가 오면 퍼커션을 빼는 수직 레이어"로 설명한다 [S4][2차]. NL의 비 버전에는 가벼운 링잉 음이, 눈 버전에는 썰매방울이 더해진다 [S1][S2][2차]. 원작(GC)에서는 비가 오면 시간과 무관하게 한 곡이 나왔다는 서술도 있다 [S1][2차·불확실]. 정각에는 곡이 끝나고 종이 울린 뒤 다음 곡이 시작된다 [S6][2차·어느 작품인지 불확실] | 날씨는 멜로디를 지키고 **빼기와 질감 더하기**로 처리한다. 시간 전환에는 **종 스팅어**를 다리로 쓴다 |
| **젤다 시간의 오카리나** | 평원의 행동과 낮·밤 | 콘도 고지 라이너노트: 평원 곡은 플레이어 행동에 따라 다르게 전개되도록 만들어졌다 [S9]. 8마디 조각을 조합하는 방식이다 [S10][2차]. 멈추면 잔잔한 버전, 적이 다가오면 긴장 버전이 나온다 [S11][2차]. 밤에서 아침으로 넘어갈 때 별도의 아침 테마가 나온 뒤 본 테마로 이어진다 [S11]. 밤에는 BGM 없이 환경음만 들린다 [미확인·기억] | 수평 재배열의 고전. **조각 길이를 8마디 배수로 맞추면** 아무 데서나 이어 붙일 수 있다 |
| 젤다 BotW | 필드 낮·밤 | 단편적인 피아노 구절, 최소한의 화음, 구절 사이의 긴 여백 [S12][2차] | 빈 공간도 테마의 일부다. 방치형 게임에 맞는다 |
| 젤다 바람의 택트 | 전투 타격, 항해 | 타격이 성공할 때마다 음악적 장식이 붙는다. 표류할 때는 음악이 물러나고 바람과 갈매기 소리가 남는다 [S13][2차] | 상호작용 SFX를 **현재 조에 맞춘 음**으로 만든다(쓰다듬기, 창문 두드리기) |
| **커비** | 시리즈 전체 | Green Greens가 여러 작품에서 재편곡되어 나오고, "Kirby's Triumphant Return" 동기와 짝을 이룬다 [S14][2차] | 정체성은 **동기의 재사용**에서 나온다 |
| **포켓몬** | DPPt 낮·밤, BW 계절 | DPPt의 많은 마을과 도로에 낮·밤 별도 곡이 있다. 밤 곡은 더 느긋하고 피아노·재즈 색이 있으며, 일부는 악기만 미묘하게 바뀐다 [S16][2차]. BW는 계절마다 대부분 지역의 음악이 **살짝** 바뀌고, 겨울 차임이 가장 두드러진다 [S15]. 금·은의 시간대별 BGM 변화는 확인하지 못했다(없었던 것으로 기억) [미확인] | 계절은 **작은 장식 하나**(차임)로 충분하다 |
| **스타듀 밸리** | 계절, 비 | 계절마다 여러 곡이 무작위로 나온다. 야외 곡은 반복하지 않고, 곡 사이를 계절 앰비언스가 채운다 [S17]. 비 오는 날에는 빗소리 SFX 루프가 중심이 된다 [2차·모드 페이지 기반] | **음악이 쉬는 시간**을 설계에 넣는다 |
| **A Short Hike** | 산의 구역, 행동, 날씨 | 작곡가 Sparling이 제안했다. 산을 지나가며 구역마다 레이어와 악기가 늘어나고, 비행 같은 행동과 날씨에 반응한다 [S18] | 진행도(등불 8칸)를 **레이어 수**로 들려줄 수 있다 |
| **셀레스트** | 방 진행, B-side | FMOD를 쓴다. 방마다 `progress`, `layer1…` 파라미터로 레이어를 켠다(모딩 위키 기준) [S19][2차]. B-side는 같은 챕터 곡을 게스트 작곡가가 각각 리믹스한 것이다 [S19] | 같은 선율이면 장르가 바뀌어도 한 사운드트랙으로 들린다 |
| 오리 | 캐릭터와 지역 | 캐릭터 동기가 있다. 메인 테마는 아꼈다가 결정적 순간에 쓴다 [S20][2차] | **풀 테마는 아껴 둔다.** 방 완성 팡파르에만 전체 동기를 쓴다 |
| 마인크래프트 | 바이옴 | 곡 사이에 수 분에서 20분까지 침묵이 있다. 최근 업데이트는 바이옴별 곡 풀을 쓰고, 일부 바이옴에서는 음악이 페이드아웃된다 [S21][2차] | 침묵과 앰비언스도 트랙이다 |

### 1.3 작은 웹게임 + 미리 렌더한 오디오 파일에 맞는 조합 [추정]
- **완전 재편곡**은 상태 수가 가장 적고 감정 차이가 가장 큰 축 하나에만 쓴다. 그 축은 **시간대(4)**다.
- **수직 스템**은 날씨(4)와 등불 진행(0–8)에 쓴다. 시간대 4 × 날씨 4 = 16 조합을 스템 8–12개로 해결한다. Web Audio에서는 같은 `ctx.currentTime`에 시작하면 샘플 단위로 동기가 맞는다(03 문서).
- **수평 루프**는 장소(12)처럼 상태가 이산적인 축에 쓴다.
- **무박 펜타 레이어**는 날씨와 계절의 질감에 쓴다. 가장 싸고 가장 안전하다.
- **징글과 더킹**은 기분과 이벤트에 쓴다.
- **침묵**도 쓴다. 집 테마 사이클이 끝나면 20–90 s 동안 앰비언스만 남긴다(01 문서와 같음).

---

## 2. 음악심리: 큐에서 기분으로

### 2.1 연구 요점 (숫자 위주)
- **Eerola, Friberg & Bresin 2013** [S27]: 큐 6개(선법, 템포, 음역, 다이내믹, 아티큘레이션, 음색)를 요인 설계로 조작했다. 청자가 200개 예제를 happy/sad/peaceful/scary로 평정했다.
  - 중요도 순서는 **선법 > 템포 > 음역 > 다이내믹 > 아티큘레이션 > 음색**이다. 감정마다 순서가 조금 다르다.
  - 큐 수준의 효과는 대체로 **선형**이었고 분산의 **77–89%**를 설명했다. 2차항을 더해도 0–8%만 늘었다.
  - 큐 사이의 **상호작용은 거의 없었다(가산적)**. 그래서 큐를 독립된 손잡이처럼 따로 돌려서 기분을 설계해도 된다.
  - 행복이 가장 잘 전달된 조합은 장조, 빠른 템포, 높은 음역, 스타카토였다. 무서움은 단조, 낮은 음역, 큰 소리 조합이 이끌었다. 이 게임에서는 **이 조합을 금지한다.**
- **Juslin & Laukka 2003** [S25]: 음성 연구 104편과 음악 연주 연구 41편을 메타분석했다. 결론은 "다른 채널, 같은 코드"다.
  - 행복: 빠른 템포, 작은 템포 변동, 스타카토, 큰 소리, 밝은 음색, 빠른 어택 [2차 인용 표].
  - 다정함(tenderness, Juslin & Persson 계열 표): 느린 템포, 느린 어택, 작은 소리, 레가토, 부드러운 음색 [S32][2차].
- **Gabrielsson & Lindström 2010** [S26]: 문헌을 종합하면 가장 영향력 있는 요인은 선법, 템포, 다이내믹, 아티큘레이션, 음색, 프레이징이다. 요인들은 가산적으로도 상호작용적으로도 작동한다 [2차 요약].
- **Hevner 1935–37** [S28]: 감정을 결정하는 큐는 선법, 템포, 리듬(굳은 리듬과 흐르는 리듬)이었다. 한 옥타브 올리면 "더 행복하게", 내리면 "더 슬프게" 들렸다 [2차].
- **Bernardi 2006 (Heart)** [S29]: 호흡과 심박의 각성은 **템포에 비례**했다. 음악 사이의 **쉼에서는 심박, 혈압, 분당 환기량이 기준선보다 더 낮아졌다.** 차분함을 만드는 가장 강한 도구는 쉼표와 침묵이다.
- **Moelants 2002** [S30][2차]: 선호 템포 분포는 **115–127 BPM에 몰리고 125 BPM 근처에서 정점**을 이룬다(약 2 Hz 공명). 그래서 집 테마 80 BPM은 "걷기보다 느린 쉼"이고, 폴짝 징글 140–160 BPM은 "공명을 넘는 들뜸"이다.
- **Trainor et al. 1997 / Corbeil, Trehub & Peretz 2013** [S31]: 아기에게 부르는 노래는 더 느리고 음높이가 높다. 자장가는 **매우 느린 템포, 낮은 음높이, 하행 윤곽, 좁은 음량 변화**를 보인다. 놀이노래는 음높이 변동이 크고 리듬이 과장된다. 각각 졸림과 폴짝의 원형이다.
- 참고 [미확인 귀속]: Juslin & Lindström 2010에서는 템포를 70 BPM과 175 BPM 두 수준으로 조작했다고 검색 요약에 나온다.

### 2.2 큐 매핑 표 (칩튠 채널로 번역)
| 목표 기분 | 선법·화성 | 템포 | 음역 | 밀도 | 아티큘레이션 | 칩 음색 | 근거 |
|---|---|---|---|---|---|---|---|
| 차분(덤덤) | 장조, add9, 열린 끝 | 60–80 | 중 | 2–3성, 쉼 많음 | 레가토 | 50% 사각 + 삼각 | Juslin 다정함, Bernardi, Eerola peaceful [일부 2차] |
| 신남(폴짝) | 장조, 펜타 상행 | 132–160 | 고(C5–F6) | 16분, 4성 | 스타카토, 빠른 어택 | 12.5%·25%, 피치 상행 스윕 | Eerola 행복 조합, J&L 행복 |
| 뿌듯(우쭐) | 장조 I–IV–V–I, 점리듬 | 104–120 | 중저–중 | 옥타브·3도 병행 | 마르카토, 굳은 리듬 | 50% 두 겹 + 강한 삼각 | Hevner 굳은 리듬, 큰 소리 = 힘 [2차·추정] |
| 졸림 | IV→I(변격), 하행 | 45–63, 리타르단도 | 중저 | 1–2성 | 레가토, 느린 어택 | 삼각 + 작은 12.5%(오르골) | Trainor, Corbeil, 01 문서 |
| 호기심 | 믹솔리디안·리디안, 반음 이웃음 | 92–110 | 중고 | 문답형, 쉼표 | 스타카토 + 꾸밈음 | 25% ↔ 50% 대화 | [추정] 기본 감정 연구 밖 |
| 신비·꿈 | 에올리안·리디안 + sus·4도 화음 | 60–76 | **중고**(저음 피함) | 성김, 지속음 | 레가토 + 에코 | 12.5% 아르페지오 + 페달 | [추정]. 저음 + 단조 + 큰 소리 = 무서움 [S27]이므로 회피 |
| 그리움 | 믹솔리디안 ♭VII, iv 차용 | 72–90 | 중 | 보통 | 레가토, 약한 스윙 | 50% + 점8분 에코 | [2차·약함] 선법 블로그 [S34] |

### 2.3 날씨와 장소의 소리 연상
| 대상 | 흔한 연상 | 근거 수준 | 칩튠 번역 [추정] |
|---|---|---|---|
| 비 | 드럼을 빼고, 마림바 같은 짧은 베이스로, 빗소리가 주인공 | AC NH [S3][S4] | 노이즈 스템을 끈다. 삼각 베이스는 짧은 게이트("뽁"). 무박 펜타 물방울을 더한다. 밴드패스 노이즈 빗소리를 깐다 |
| 눈 | 썰매방울, 실로폰류 종, 차임 | AC NL/NH [S2][2차], BW 겨울 [S15] | 고음 펜타 종(0.1–0.3음/s). 노이즈 숏모드 방울 트레몰로를 드물게. 나머지는 먹먹하게(LPF) |
| 맑은 밤 | 리디안 = 경이·마법, 아르페지오 반짝 | 블로그 수준 [S34], BotW 여백 [S12] | 12.5% 고음 반짝이를 무박으로 |
| 바다 | 6/8 흔들림(바르카롤은 곤돌라의 노 젓기) | [S33] | 6/8, 삼각 1–5–8 굴림, 롱노이즈 파도 스웰 |
| 바다(해적·뱃노래) | 도리안 | 현대적 관습일 뿐 [S33 인근 포럼, 2차·약함] | G 도리안(F장조 집합 그대로) |
| 바람·표류 | 음악이 물러나고 환경음이 앞으로 | 바람의 택트 [S13] | sky의 브리지에서 4마디 쉼과 바람 노이즈 |

---

## 3. 같은 조 가족 안에서 놀기와 전환 실무

### 3.1 세 음집합 (5도권 한 칸 규칙)
| 집합 | 조표 | 홈과 다른 음 | 이 집합 안의 선법 | 담당 |
|---|---|---|---|---|
| **W (따뜻함)** | 2♭ | E♭ | B♭ 이오니안, F 믹솔리디안, C 도리안, G 에올리안 | 노을, 집과 사람, 잠 |
| **H (집)** | 1♭ | — | F 이오니안, G 도리안, C 믹솔리디안, D 에올리안, B♭ 리디안 | 낮, 밤, 새벽(바탕), hands, sea, signs, numbers, mind, 창가 비 |
| **B (밝음)** | 0 | B♮ | F 리디안, C 이오니안, D 도리안, G 믹솔리디안, A 에올리안 | 새벽(색), sky, sounds, wild, door_out |

- **같은 집합 사이**에서는 중심음만 바뀌므로 크로스페이드로 겹쳐도 충돌이 없다.
- **이웃 집합 사이**에서는 한 음(E♭/E, B/B♭)이 겹치는 순간 부딪힐 수 있다. 그래서 1마디 겹침으로 짧게 넘기거나, 앰비언스나 종을 다리로 쓴다.
- **공통 안전 집합 = F G A C D(F 메이저 펜타)**: W, H, B 세 집합에 모두 들어 있다. 무박 레이어, 징글 선율, UI 음은 전부 이 다섯 음으로 만든다.

### 3.2 화성 일관성 장치
- 그라운드는 01 문서의 캐논 진행이다. 장소 곡은 같은 4화음을 **회전**해 쓴다.
  - I–V–vi–IV는 밝다.
  - vi–IV–I–V는 애틋하다(mind, 창가 비).
  - IV–I–V–vi는 떠 있는 느낌을 준다.
- 집합을 바꿀 때는 **이조**한다(집과 사람 = IV조 B♭, door_out = V조 C).
- **돌림노래 규칙**: 화성 주기(4마디)의 배수만큼 늦게 들어오는 카논 성부는 리더가 같은 마디에 밟았던 화음 위에 놓인다. 그래서 반주 화성과는 항상 맞는다. 성부끼리의 충돌(강박의 2도·7도, 병행 5도·8도)만 점검하면 된다(01 §2-2).

### 3.3 템포 격자 [추정]
- 기준은 80 BPM(1마디 3.0 s)이다. 쓰는 템포는 60 / 68 / 76 / 80 / 84 / 96 / 100 / 104 / 112 / 120 / 144 정도로 제한한다.
- 징글은 현재 곡의 박에 양자화한다(80 BPM에서 대기 ≤ 0.75 s). 그래서 징글 자체의 템포는 자유다.
- `playbackRate` 트릭: 2/3은 완전5도 아래(B♭)이면서 ×2/3 템포, 3/4은 완전4도 아래(C)이면서 ×3/4 템포가 된다. 순정 음정과의 차이는 2 cent다. 음높이와 템포가 함께 바뀌어도 키 가족 안에 머문다.
  - 칩 음색은 포먼트가 없어서 늘려도 자연스러운 편이지만, 비브라토와 엔벨로프도 함께 느려진다. 귀로 확인이 필요하다.

### 3.4 전환 규칙
| 전환 | 언제 | 방법 | 길이 | 근거 |
|---|---|---|---|---|
| 장소 ↔ 장소, 집 ↔ 장소 | **다음 마디선**(대기 ≤ 1마디 ≈ 3 s) | 같은 집합이면 등전력 크로스페이드 1마디. 이웃 집합이면 1마디 페이드아웃 → 0.5마디 앰비언스 → 새 곡을 다운비트에 진입(50 ms 디클릭 페이드인) | 2–4.5 s | FMOD 전환 영역 양자화 [S22]. 2–4마디 창(낮은 신뢰) [S22]. 나머지 [추정] |
| 최소 체류 | 모든 곡 | 진입 후 **8마디**가 지나기 전에는 다른 곡으로 바꾸지 않는다(peek가 연달아 올 때 곡이 요동치지 않도록) | — | [추정] |
| 시간대(6, 9, 17, 19시) | 시각 경계 뒤 현재 **4마디 프레이즈**가 끝날 때 | 2마디 페이드아웃 → **종 스팅어** 2–3 s → 새 시간대 곡을 패스1부터 | ≤ 20 s | AC 정각 종 [S6][2차] |
| 날씨 | 즉시 시작하되 천천히 | 스템 게인 램프 4–8 s, 필터 컷오프 램프 6 s, 앰비언스 6–12 s | 4–12 s | [추정] 비는 서서히 온다 |
| 잠들기 | wrap_up 뒤 | 현재 곡을 2마디 동안 페이드 → 졸림 징글 → 자장가 2–3회 → 페이드 → 빗소리만 | — | Bernardi의 쉼 효과 [S29] |
| 사이클 휴식 | 집 테마 | 한 사이클(약 3.4분)이 끝나면 20–90 s 동안 앰비언스만 | — | 01 문서, Minecraft, Stardew [S17][S21] |

### 3.5 스팅어와 더킹
- **기분 징글**: BGM을 **−9 dB** 내린다. 어택 50–80 ms, 릴리스 400–600 ms.
  - Game Developer의 예시가 "−9 dB를 500 ms에 걸쳐"다 [S24]. 일반적인 범위는 6–12 dB다 [2차].
  - 03 문서의 이벤트 SFX용 −3 dB 더킹은 짧은 효과음에 쓴다. 선율이 있는 징글에는 더 깊은 −9 dB를 쓴다.
- **시작 시점**: 버튼과 UI 음은 즉시 낸다. 기분·이벤트 징글은 **다음 박**에 낸다.
- **큰 팡파르**(방 완성, 등불 8칸): BGM을 일시정지 → 팡파르 6–8 s → 다음 프레이즈 처음부터 재개한다. 포켓몬의 아이템 획득 팡파르 관행과 비슷하다 [미확인·기억].
- **징글의 음 재료**: 선율은 F 펜타로만 쓰고, 화성은 I, IV, V까지 허용한다. 반드시 F로 끝낸다. 실패와 none에 단2도, 단조, 부저를 쓰지 않는다(CONTEXT 금지 규칙).

### 3.6 렌더 메모 (03 문서 보완) [추정]
- 같은 곡의 스템은 **샘플 단위로 같은 길이와 같은 루프점**을 갖는다.
- 에코 꼬리는 루프를 두 번 렌더한 뒤 둘째 바퀴를 잘라 앞머리에 굽는다.
- 무박 레이어는 박이 없으므로 길이가 달라도 된다. 곡과 다른 길이(예: 37 s)로 만들면 반복 주기가 어긋나서 덜 질린다.
- 디코딩 메모리 때문에 집 테마 스템을 **2묶음**(core = P1+TRI, extra = P2+P3+NOI)으로 줄이면 파일 수가 20개로 맞춰진다.

---

## 4. 이 게임의 매핑 (홈 = F장조, 모티프 M = 01 §4-1)

### 4.1 트랙 예산
| 분류 | 내용 | 곡 수 | 파일 수 |
|---|---|---|---|
| 풀 편곡(시간대) | 새벽, 낮, 노을, 밤. 각각 스템 core / canon / groove | 4 | 10–12 (스템 2묶음이면 8) |
| 장소 루프 | 9개 코너 + door_out, 각 16마디(door_out은 8마디 + 태그) | 10 | 10 |
| 특수 | 자장가, 창가 비(01 §4-4 D단조) | 2 | 2 |
| 파생(파일 없음) | slow_room = core × `playbackRate 2/3`. letter_room = 앰비언스 + 스팅어 | (2) | 0 |
| **BGM 합계** | | **16** | **20–24** |
| 무박 레이어 | 물방울, 눈 방울종, 반짝(별·반딧불 겸용), 겨울 차임 | — | 4 |
| 앰비언스 | 비, 가는 비, 눈 정적(바람), 여름밤(귀뚜라미) | — | 4 |
| 징글·스팅어 | 기분 4개 + 졸림→잠 + 이벤트 약 10개 | — | 약 15 |

### 4.2 시간대 4 (집 테마의 완전 재편곡: 같은 M, 같은 그라운드, 다른 옷)
| 시간대 | 선법·집합 | BPM·박자 | 채널 편성 | 텍스처·밀도 | 성격 한 줄 |
|---|---|---|---|---|---|
| 새벽 06–09 | F 이오니안(H) + F 화음 위 B♮ 위이웃음으로 리디안 색(B) | 76, 4/4 | P1 12.5% 리드(높은 옥타브, 늦은 비브라토), P2 50% sus2 지속, TRI 1·3박만. 첫 8마디는 베이스 없이 시작. NOI 없음 | 2–3성, 쉼 많음. 서서히 밝아진다 | 창틈으로 들어오는 첫 빛, 아직 반쯤 잠 |
| 낮 09–17 | F 이오니안(H). 01의 메인 그대로 | 80, 4/4 | 01 §4-2: P1 50%, P2 25% 카논, P3 12.5% 8va, TRI 그라운드, NOI 아주 작은 틱 | 패스1→3으로 1성→3성까지 늘었다가 줄어든다 | 등불 아래 콧노래, 보통의 하루 |
| 노을 17–19 | F 믹솔리디안 색(W): 종지를 I–♭VII(E♭)–IV–I로, 꼬리 IV–iv–I | 76, 4/4, 8분 약한 스윙(55:45) | P1 50% 리드 + 점8분 에코(−9 dB), P2 25%가 3도 아래 화음, TRI 2분음표, NOI 브러시(숏모드, 극소) | 보통–성김, 레가토 | 금빛으로 하루를 접는 약간의 아쉬움 |
| 밤 19–06 | F 이오니안(H), 왕도진행 IV△7–V7–iii7–vi7(01 §4-4) | 68, 4/4 | TRI 온음표 페달, P2 50% 낮은 음역 선율(M을 2배 확대), P1 12.5% 2옥타브 위 별 아르페지오(드물게). NOI 없음 | 성김, 긴 쉼 | 별이 보이는 창, 등불 하나만 켠 밤 |

- 스템 정의: **core** = 선율 + 베이스(P1, TRI), **canon** = 돌림 성부와 아르페지오(P2, P3), **groove** = NOI. 밤과 새벽에는 groove 스템이 없다.
- 등불 진행 [추정]: 0–2칸이면 core에 canon 30%. 3–5칸이면 canon 100%. 6칸 이상이고 날씨가 허락하면 groove를 켠다. 8칸이 되면 밤에는 별 반짝을 상시로 켠다.

### 4.3 날씨 4 (스템 믹스 + 무박 레이어 + 앰비언스. 곡은 바꾸지 않는다)
| 날씨 | 스템 믹스 | 필터 | 얹는 무박 레이어(F 펜타) | 앰비언스 | 성격 한 줄 |
|---|---|---|---|---|---|
| clear 맑음 | core, canon, groove 100% | 없음 | 밤: 별 반짝(12.5%, C6–F7, 0.3–0.8음/s). 여름밤: 반딧불(같은 재료, 0.1–0.3음/s, 느린 어택) | 낮: 실내 공기(극소). 여름밤: 귀뚜라미 | 활짝 열린 창 |
| drizzle 가는 비 | core + canon. groove 끔 | LPF 약 6 kHz | 물방울(TRI 또는 GB 웨이브 짧은 "똑", C5–C7, 0.2–0.5음/s) | 가는 빗소리(밴드패스 노이즈, 음악보다 약 −12 dB) | 창에 맺히는 몇 방울 |
| rain 비 | core 100%, canon −6 dB, groove 끔. 선택: 베이스를 짧은 게이트 TRI로 바꾼 "core-rain" 스템(AC식 마림바 베이스) | LPF 약 2.5–3 kHz | 물방울을 더 촘촘히(0.5–1.5음/s) | 빗소리(400 Hz–6 kHz 노이즈, 0.1–0.3 Hz 느린 진폭 흔들림). 음악보다 앞에 둔다 | 빗소리가 주인공이고 음악은 그 아래 이불 |
| snow 눈 | core만(−3 dB) | core만 LPF 약 4 kHz(먹먹하게). 종은 필터 없이(대비) | 눈 방울종(0.1–0.3음/s) + 노이즈 숏모드 썰매방울 트레몰로(30 s에 1회 정도) | 거의 무음(바람 약 −36 dB) | 세상이 소리를 낮추고 높은 종만 반짝 |

- 창가 장면(stay_home "빗방울 세기")에서 비가 오면 01의 D단조 vi–IV–I–V 72 BPM 곡으로 바꾼다. H 집합이므로 1마디 크로스페이드면 된다.
- 계절 [추정, BW 방식의 작은 장식]
  - 봄: 새소리 원샷(펄스 상행 스윕).
  - 여름: 밤 반딧불 레이어.
  - 가을: 낙엽 노이즈 원샷. 노을 곡의 재생 비중을 늘린다.
  - 겨울: 겨울 차임 레이어(F와 C 종이 드물게). 1–2월에는 snow가 우선한다.

### 4.4 장소 12 (16마디 루프. 모두 M의 변형)
| 장소 | 선법·집합 | 화성 | BPM·박자 | 채널 편성 | 변주 기법·텍스처 | 성격 한 줄 |
|---|---|---|---|---|---|---|
| hands 손과 물건 | F 이오니안(H) | I–V–vi–IV | 100, 4/4 | P1 25% 스타카토 리드, P2 12.5% 16분 "톱니" 오스티나토, TRI 옥타브로 튀는 베이스, NOI 숏모드 틱 | M **축소**(음가 ½), 리듬을 반박 밀기 | 만지작만지작, 작은 손재주 |
| sea 바다와 생물 | G 도리안(H, E♮ 색) | i–IV(Gm–C) 반복 | 6/8, ♩.=56 | P1 50% 느린 비브라토 리드, P2 25%가 3도 아래 따라감, TRI 1–5–8 굴림, NOI 롱모드 2마디 파도 스웰 | M을 6/8로 **재박**(바르카롤) | 물결 위 바르카롤, 짠내 나는데 밝음 |
| sky 하늘과 날씨 | F 리디안(B) | I–II(F–G/F), 01의 경이 진행 | 84, 3/4 | P1 12.5% 고음 롱노트 + 스윕 글라이드, P2 50% 넓은 아르페지오, TRI 2마디에 1음. 브리지에서 4마디 바람 노이즈 | M의 **음정 확대**(도약을 넓힘), 왈츠 | 구름 사이를 미끄러지는 왈츠 |
| signs 기호와 언어 | C 믹솔리디안(H) | I–♭VII–IV–I(C–B♭–F–C) | 96, 4/4 | P1 25% 질문 2마디 ↔ P2 50% 대답 2마디, TRI 스타카토, NOI 극소 | M을 **문답으로 분할**, 반음 이웃음 장식 | 글자 퍼즐, 두 목소리가 묻고 답함 |
| numbers 수와 모양 | F 이오니안(H) | I–V–vi–IV 그라운드 | 104, 4/4 | P1 25% 테마, P2 25% **1마디 늦은 카논**, TRI 4분음표 일정, NOI 메트로놈 햇 | 엄격한 2성 카논(돌림노래), 순차 셈 | 규칙대로 쌓이는 블록 |
| sounds 소리와 리듬 | D 도리안(B) | i–IV(Dm–G) 그루브 | 104, 4/4 스윙 | **NOI 주연**(킥, 스네어, 햇), P1 12.5% 짧은 리프, P2 50% 오프비트 코드, TRI 싱코페이션 | 처음 4마디는 M의 **리듬만**(노이즈), 그다음 음높이를 입힌다 | 장단 맞추기, 발가락이 까딱 |
| home 집과 사람 | B♭ 이오니안(W) | 메인 그라운드를 IV조로 이조 | 84, 4/4 | P1과 P2 50%가 3도·6도로 병행(두 사람), TRI 부드러운 2분음표 | 메인 테마를 **IV조로 이조**: "이웃집 창에서 들리는 우리 노래" | 남의 집 저녁 냄새, 따뜻한 이중창 |
| mind 생각(꿈·기억) | D 에올리안(H) + sus·4도 화음 평행 이동 | vi–IV–I–V 회전(Dm–B♭–F–C) | 66, 4/4 | P1 50% 리드 + 점8분 에코 2회, P2 12.5% sus 지속음, TRI 페달. NOI 없음 | M **단편화와 역행**. 중고음역을 유지한다(무서움 조합 회피) | 기억 속을 헤엄치는 느린 메아리 |
| wild 들판(미지) | G 믹솔리디안(B) | I–♭VII–I(G–F–G), 열린 5도 | 112, 2/4(점8분 + 16분 걸음) | P1 25% 넓은 도약 리드, P2 12.5% 5도 드론, TRI 열린 5도 베이스, NOI 발걸음 | 익숙한 음에 **낯선 중심음(G)**: M을 G 위에서 | 처음 가 보는 들판, 가슴 뛰는 개방 5도 |
| slow_room 느린 글의 방 | B♭ 장(W). 낮 core × 2/3 | (원곡 그대로) | 53, 4/4(파생) | 낮 core 스템을 `playbackRate 2/3`으로 재생. 파일 없음 | **확대 + 하행 이조**를 한 번에 | 한 글자씩 천천히 읽는 방 |
| letter_room 편지의 방 | 조성 없음. F–C 열린 5도 | — | 무박 | 진입 시 1회: TRI F 페달 + P1 50%로 M의 첫 2음만. 2음(G)에서 멈춘다. 그 뒤로는 앰비언스만 | **미완**(대답 없는 질문). 루프가 아니다 | 답장 없는 자리, 미완의 두 음 |
| door_out 밖의 문 | C 이오니안(B, V조) | 메인 그라운드를 C로 이조. 태그 C7→F | 88, 4/4 | P1 12.5% 밝은 리드, P2 25% 돌림, TRI, NOI 가벼운 햇 | 메인 테마를 **딸림조로 이조**. 8마디 + 2마디 태그가 F로 돌아온다 | 문 밖으로 한 발, 한 칸 밝은 바깥 공기 |

- 재생 시점 [추정]
  1. 산책 중 peek 로그가 뜬 장소의 테마로 마디선에서 바꾼다. 최소 8마디 체류 규칙을 지킨다.
  2. 귀가 뒤 remember 단계에서 대표 장소 테마를 8마디 회상한다.
  3. 포스터를 확대해 볼 때 해당 장소 테마를 튼다.
- 문어가 나가 있는 동안 집 테마는 **core만 −3 dB**로 둔다. 빈 방의 느낌을 준다.

### 4.5 기분 4 + 잠 (징글은 BGM −9 dB 더킹. 선율은 F 펜타, F로 해결)
| 기분 | 조성·화성 | 템포 | 채널 | 형태 | 길이 | 성격 한 줄 |
|---|---|---|---|---|---|---|
| 폴짝(신남) | F장. M 머리를 펜타 상행 아르페지오로 늘이고 옥타브 점프, 높은 F로 끝 | 144–160 | P1 12.5% 스타카토, P2 25% 3도 위 메아리, NOI 짧은 "퐁" + 피치 상행 스윕 | 상행, 고음, 스타카토, 밝은 음색(Eerola 행복 조합) | 1.5–2.5 s | 다리가 아직 들썩거려 |
| 우쭐(뿌듯) | F장 I–IV–V–I. 마지막 화음을 길게 | 112 | P1과 P2 50%가 옥타브·3도 병행 마르카토, TRI 근음을 강하게, NOI 짧은 스네어 롤 | 점리듬 팡파르, 중음역, 비교적 큰 소리 | 3–4 s | 가슴 펴고 포스터를 가리킴 |
| 덤덤(담담) | F add9. 3음(A)에서 멈춘다(완전종지를 피함) | 72 | P1 50% 레가토 2–3음, TRI 1음 | 작고 짧고 열린 끝 | 2–3 s | 응, 그렇구나 |
| 졸림 | B♭→F 변격종지, 하행 윤곽 | 63→45 리타르단도 | P1 12.5% 작게(비브라토가 점점 느려짐, 마지막 음 약 −20 cent 처짐), TRI 저음 F | 하행, 느려짐, 감쇠(자장가 특성 [S31]) | 3–5 s | 눈꺼풀이 천천히 내려옴 |
| 잠(BGM) | F장(01 §4-4) 또는 B♭장(W). F 페달 위 플라갈 흔들림 | 58–63, 3/4 | 오르골: P1 12.5% 빠른 감쇠(약 0.4 s), 2옥타브 겹침, TRI 온마디. NOI 없음 | M **확대 + 하행 변형**. 다이내믹은 거의 고정. 2–3회 반복 후 페이드하고 빗소리만 남긴다 | 16마디 루프 | 이불을 덮어 주는 흔들의자 |

### 4.6 이벤트 스팅어 (선택, 모두 M의 조각) [추정]
| 이벤트 | 재료 | 길이 |
|---|---|---|
| depart 출발 | M 머리 2음 → C(V)로 상행. NOI 문소리 | 1.5 s |
| return 귀가 | C→F(V–I)로 M 꼬리 해결 | 2 s |
| remember 기억 | M 단편 + 점8분 에코 2회 | 1.5 s |
| hang_poster 포스터 | NOI "탁" + 우쭐 축소판(I–V–I) | 2 s |
| 등불 n칸 | F장 음계 **1도부터 n도까지** 상행 아르페지오. 1칸은 F, 8칸은 높은 F. 진행이 귀로 들린다 | 0.5–1.5 s |
| 방 완성(8칸) | M 전체 팡파르. BGM 일시정지 후 재개 | 6–8 s |
| 시간대 종 | TRI + P1 12.5%로 F–C–F 종 | 2–3 s |
| peek 결과 | read: 2음 상행 "톡". builtin: 책장 노이즈 + 2음. simulated: 에코 2음. failed: 같은 음 두 번 "음…"(작게). none: TRI 1음 | 0.3–0.8 s |

---

## 5. 출처 (Sources)
- [S1] Nookipedia, Rain: https://nookipedia.com/wiki/Rain
- [S2] Nookipedia, Snow: https://nookipedia.com/wiki/Snow
- [S3] Totaka 프로필, Arkansas Democrat-Gazette 2020-05-31(PressReader): https://www.pressreader.com/usa/arkansas-democrat-gazette/20200531/283820035807683
- [S4] gamemusic.net, The Sound of Animal Crossing New Horizons: https://gamemusic.net/?p=20207
- [S5] Nookipedia, Yasuaki Iwata(NH 시간별 곡과 비·눈 버전 크레딧): https://nookipedia.com/wiki/Yasuaki_Iwata
- [S6] AC 음악 확장(맑음·비·눈 변형): https://acmusicext.com/features · Kotaku: https://kotaku.com/animal-crossing-music-nintendo-web-browser-app-2000701527 · AnimalCrossingWorld(Nintendo Music 시간 동기화): https://animalcrossingworld.com/2025/11/animal-crossing-new-leaf-music-arrives-on-nintendo-music-with-perfect-hourly-sync-feature/
- [S9] Square Enix Music, OoT 라이너노트: https://squareenixmusic.com/features/liners/zeldaocarina.shtml
- [S10] Clash Music, OoT 음악 유산: https://www.clashmusic.com/?p=462531
- [S11] Zelda Dungeon, Hyrule Field Main Theme: https://zeldadungeon.net/wiki/Hyrule_Field_Main_Theme · Morning Theme: https://www.zeldadungeon.net/wiki/Hyrule_Field_Morning_Theme
- [S12] TechRaptor, BotW 사운드트랙: https://techraptor.net/gaming/features/underappreciated-achievements-in-breath-of-wild-soundtrack · Zelda Dungeon, Field (Day): https://www.zeldadungeon.net/musical-musings-listening-closely-to-the-emptiness-of-breath-of-the-wilds-hyrule-field-day/
- [S13] Square Enix Music, Wind Waker 리뷰: https://squareenixmusic.com/reviews/jonturner/zeldawind.shtml
- [S14] WiKirby, Kirby's Triumphant Return: https://www.wikirby.com/wiki/Kirby%27s_Triumphant_Return · Green Greens: https://www.mariowiki.com/Green_Greens
- [S15] Serebii, BW 배경음악·계절: https://www.serebii.net/blackwhite/bgmusic.shtml · https://serebii.net/blackwhite/seasons.shtml
- [S16] PokéCommunity, 낮·밤 음악: https://www.pokecommunity.com/threads/the-music-was-different-between-night-day.429824/post-10116419 · Square Enix Music, DP 리뷰: https://www.squareenixmusic.com/reviews/charles/pokemondiamond.shtml
- [S17] Stardew Valley 개발 업데이트(계절 곡 무작위, 앰비언스): https://www.stardewvalley.net/?p=854 · 위키 Music(열람 불가, 검색 요약만): https://stardewvalleywiki.com/Music
- [S18] A Short Hike: https://en.wikipedia.org/wiki/A_Short_Hike · Edge "The Making Of": https://www.pressreader.com/australia/edge/20200813/281556588171738 · itch.io: https://itch.io/post/1584710/view-in-topic · Bandcamp Daily: https://daily.bandcamp.com/high-scores/high-scores-mark-sparling
- [S19] Everest 모딩 위키, Advanced Custom Audio: https://github.com/EverestAPI/Resources/wiki/Advanced-Custom-Audio · FMOD Celeste 가이드: https://www.fmod.com/docs/studio/appendix-a-celeste.html · Game Audio Lookout: https://medium.com/game-audio-lookout/enhancing-gameplay-with-music-in-celeste-5da210bbc602 · B-Sides: https://www.materiacollective.com/music/celeste-b-sides-original-game-soundtrack · https://celeste.hsmusic.wiki/album/celeste-b-sides
- [S20] Windows Central, Gareth Coker: https://www.windowscentral.com/inside-majestic-music-ori-and-will-wisps-composer-gareth-coker · GodisaGeek 인터뷰: https://godisageek.com/2020/04/gaming-is-the-medium-i-feel-i-understand-the-best-interview-with-gareth-coker-composer-for-ori-and-the-will-of-the-wisps/
- [S21] Music of Minecraft: https://en.wikipedia.org/wiki/Music_of_Minecraft · 위키 미러 Song: https://wiki.ronlab.site/content/minecraftwiki_en_all_maxi_2025-11/Song
- [S22] 적응형 음악 기초: https://gamemaker.io/en/blog/compose-video-game-music · https://bugnet.io/blog/adaptive-music-a-beginners-guide · https://bugnet.io/blog/how-to-make-music-transitions-smooth-in-games · Oak National Academy: https://www.thenational.academy/teachers/programmes/music-secondary-ks4-aqa/units/computer-game-music/lessons/horizontal-resequencing · Audiokinetic Q&A: https://blog.audiokinetic.com/qa/2611/transition-segments-alongisde-previous-playlist-containers
- [S24] Game Developer, Game Audio Theory: Ducking: https://www.gamedeveloper.com/audio/game-audio-theory-ducking
- [S25] Juslin & Laukka 2003, Psychological Bulletin 129(5): https://doi.org/10.1037/0033-2909.129.5.770
- [S26] Gabrielsson & Lindström 2010, Handbook of Music and Emotion pp. 367–400: https://typeset.io/papers/the-role-of-structure-in-the-musical-expression-of-emotions-2tfmgam4l1 · Oxford Handbook 장: https://academic.oup.com/edited-volume/34489/chapter/292614599
- [S27] Eerola, Friberg & Bresin 2013, Frontiers in Psychology 4:487: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2013.00487/full · JYU 사본: https://jyx.jyu.fi/handle/123456789/44170
- [S28] Hevner 1936, Experimental studies of the elements of expression in music: https://typeset.io/pdf/experimental-studies-of-the-elements-of-expression-in-music-db12j72rhe.pdf
- [S29] Bernardi et al. 2006, Heart 92(4):445–452: https://heart.bmj.com/content/92/4/445
- [S30] Moelants 2002 2차 요약: https://sonicscoop.com/?p=52876 · https://link.springer.com/article/10.3758/s13421-024-01543-6
- [S31] Trainor et al. 1997: https://trainorlab.mcmaster.ca/publications/pdfs/trainor_et_al_1997.pdf · Corbeil, Trehub & Peretz 2013: https://pmc.ncbi.nlm.nih.gov/articles/PMC3693090
- [S32] Juslin·Persson 다정함 큐 표(2차): https://continuum-hypothesis.com/music/FULLTEXT01.pdf
- [S33] Barcarolle: https://en.wikipedia.org/wiki/Barcarolle
- [S34] 선법 성격(블로그, 근거 약함): https://markslater.net/?p=2051 · https://blog.songtive.com/?p=2133
- 칩 사양(03 문서와 공통): https://www.nesdev.org/wiki/APU_Pulse · https://nesdev.org/wiki/APU_basics · https://gbdev.io/pandocs/Audio
