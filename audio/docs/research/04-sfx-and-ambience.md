# 04 · 효과음(SFX)과 날씨 앰비언스: "뽈뽈 문어"용 리서치와 설계표

> 범위: 아늑한 게임의 SFX 원칙(§1), sfxr/jsfxr/bfxr/ChipTone 수치 레시피(§2), 날씨·시간 앰비언스(§3), 이 게임에 쓸 SFX 목록 45개(§4), 출처(§5).
> 표기: **†** = 이 세션 네트워크 허용 목록 때문에 페이지를 직접 열지 못하고 검색 요약으로만 확인한 출처. **⚠** = 출처 없이 내린 설계 판단이거나 불확실한 주장. jsfxr·bfxr 소스는 GitHub에서 직접 읽었다.
> 음 이름: 과학적 음높이 표기(C4 = 가운데 도 261.6 Hz, A4 = 440 Hz). 채널 약어: **P12/P25/P50** = 듀티 12.5/25/50% 펄스, **TRI** = 삼각파, **NZ** = 15비트 LFSR 노이즈, **NZm** = 7비트(짧은 주기, 금속성) 노이즈, **SIN** = 사인(칩 바깥 음색이라 아주 조금만), **A/D** = 어택/디케이(ms), **↗/↘** = 피치 슬라이드.

## 0. 한눈 요약 (규칙 12개)
1. **조성은 F장조.** 효과음의 음정 재료는 F 펜타토닉(F G A C D)이다. 이 음 집합은 D단조 펜타토닉과 같아서 vi(Dm) 화음과 비·밤 단조 변주 위에서도 어울린다. 어떤 테마에서도 부딪히지 않는 공통 음 {C D G A}는 가장 자주 나는 UI 소리에 쓴다(§1.2).
2. **자주 나는 소리일수록 짧고 작게 만든다.** 위계는 히어로 > 이벤트 > 목소리 > 상호작용 > UI > 로그 > 앰비언스(§1.5). Material도 히어로 사운드는 드물게, 같은 방식으로 쓰라고 한다[M1].
3. **모든 탭에 소리를 넣지 않는다.** 스크롤·포커스·비활성 탭·토스트 닫기는 무음으로 둔다. 소리 사이의 "스키마(틈)"가 설계 대상이다[AC2†][M1].
4. **음정 랜덤은 음계 안에서만 한다.** 음이 있는 소리는 음계 음 가운데 골라 바꾸고, 미세 흔들림은 ±15 cent까지만 준다. 노이즈 계열은 ±1~2 반음까지 흔들어도 된다. 같은 변형이 두 번 연속 나오지 않게 셔플백을 쓴다(§1.4).
5. **실패에도 같은 모션, 다른 색을 쓴다.** 리듬·길이·엔벨로프 모양은 성공과 같게 두고 음색·음정·음역만 바꾼다. 단2도·트라이톤·반음 하강·저음 버즈·노이즈 폭발·피치 다이브는 쓰지 않는다(§1.6).
6. **오르는 음정은 기쁨, 열린 5도·동음은 담담함, 협화음으로 한 걸음 내려가는 음정은 "아직 아님"으로 쓴다.** 상행 음정이 더 행복하고 쾌적하게 평가된다는 연구가 있다[R1†].
7. **징글이 나올 때 BGM은 멈추지 않고 낮춘다(덕킹).** 히어로 −9 dB, 이벤트 −3~−4 dB, 어택 60~80 ms, 릴리스 600~900 ms. 포켓몬처럼 BGM을 끊는 방식은 방 완성 때도 쓰지 않는다[P1†].
8. **목소리 블립은 한 음절에 한 번, 최소 50 ms 간격**으로 낸다. 공백·문장부호에서는 내지 않는다. 기분에 따라 음역과 속도를 바꾼다(Celeste처럼 감정 하나가 구간 하나)[C1†][V1†].
9. **칩 음색을 부드럽게 다듬는다.** 어택 2~5 ms, 펄스는 LPF 5~8 kHz, 듀티는 25~50%, 기본 음은 350 Hz~1.4 kHz에 둔다. 톱니파·bitcrush·페이저는 쓰지 않는다.
10. **앰비언스는 베드 루프와 런타임 원샷으로 만든다.** 베드는 47~73초 길이로, 눈에 띄는 사건 없이 만든다. 물방울·귀뚜라미·딱딱 소리는 시드 스케줄러로 뿌린다[CRI†].
11. **비 오는 날 BGM 변주에서는 노이즈 채널 드럼을 빼거나 −6 dB 낮춘다.** 빗소리가 이미 그 대역을 채우고 있다. 동숲에는 비·눈 전용 시간대 BGM 변주가 있다[AC3†].
12. **처음에는 소리를 끈 상태로 시작한다.** 🔈 토글을 누르면 켜지고, 그때 audio_on 인사 소리를 낸다. 브라우저 자동재생 정책과 프로젝트 스킬 R22에 맞춘 것이다.

## 1. 아늑한 게임의 SFX 설계 원칙
### 1.1 레퍼런스 게임에서 가져올 점
| 게임/자료 | 관찰 | 이 게임에 적용 |
|---|---|---|
| 동물의 숲 시리즈 | 동물어(Animalese)는 녹음한 말소리를 잘라 재합성한 것이다. 작품마다 말 속도가 다르다(초대·튀어나와요는 빠르고, 놀러오세요·타운으로 놀러가요는 느리다). 목소리 대신 타자기 같은 "Bebebese" 옵션도 있다[AC1†]. CEDEC 2020에서 토다카·후지카와는 소리 사이의 **"スキマ(틈)"**를 강조했다. BGM과 SE가 겹쳐 포화하지 않게 미리 "소리 정리"를 하고, 서정성을 눌러 플레이어가 감정을 채울 여지를 남겼다고 한다. 사과가 떨어지는 소리 같은 **추상음**으로 손맛을 냈다[AC2†]. 비·눈 전용 시간대 BGM 변주가 있고, 눈 버전에는 썰매 방울 소리가 들어간다[AC3†] | 목소리는 녹음 없이 합성 블립으로 만든다. 문어가 말하지 않는 동안에는 소리 밀도를 낮춘다. 날씨별 BGM 변주를 두되 방울 소리는 따라 하지 않는다 |
| Celeste | 캐릭터마다 단순한 신스 패치로 음색을 정하고 모음 사이를 오가는 말처럼 간격을 뒀다. FMOD 이벤트 하나가 대화 내내 무음으로 돌다가, 초상화(감정)를 넘기면 그 감정 구간으로 재생 위치가 옮겨 가고, 글이 끝나면 다시 무음으로 돌아간다[C1†] | 목소리 블립의 음역·속도·음색을 **기분 파라미터**로 바꾼다(§4 표 V) |
| Unpacking | 폴리 파일이 1만 4천 개 넘는다. 처음 추정한 7만 5천 개를 1만 5천 개 아래로 줄였는데, 예를 들어 "부드러운 표면 위 물건은 거의 같은 소리"처럼 일반화했다. 인상파 같은 그림과 대비되게 사실적인 소리를 골랐다[U1†] | 산책 장소 9곳+특수 방을 **변형 키**로 써서 remember 하나에 변형 12개를 둔다. 카테고리로 일반화해 개수를 묶는다 |
| 슈퍼 마리오 | SFX 음을 음악의 키에서 고른다. NES에서는 같은 5채널로 냈다. 원더는 키·템포·때로는 화음까지 따라간다[MA1†] | 모든 음 있는 SFX를 F 펜타토닉으로 만든다 |
| 유비소프트 V. Gagnon (MIGS17) | 게임 전체를 키에 "튜닝"했다(스플린터 셀 컨빅션은 D단조). 경고음 하나를 음악 구간마다 맞춘 4가지 버전으로 만들었다[TU1†] | 비·밤 단조 변주에서도 F/Dm 펜타토닉은 그대로 쓸 수 있다. 다른 키 테마가 생기면 해당 징글만 다시 렌더한다 |
| 포켓몬 | 아이템 획득 팡파르(소드·실드 약 4초)가 길 BGM을 **끊고** 나온다[P1†] | 우리는 끊지 않는다. 덕킹만 한다(§1.5) |
| A Short Hike | 장소·이동 방식·날씨·비행에 따라 멜로디와 앰비언트 레이어를 더하고 뺀다[SH1] | 날씨와 시간대 레이어를 크로스페이드한다(§3) |
| 스타듀 밸리 | 비·폭풍 날에는 앰비언트 음악이 나오지 않고, 밤이 되면 음악이 멈추고 밤 소리로 바뀐다(포럼 증언)[SD1†⚠] | BGM은 한 루프 돌고 쉰다. 밤에는 자장가 변주 한 번 뒤에 앰비언스만 둔다 |
| Material Design 사운드 | 히어로 사운드는 드물고 일관되게 쓴다. 침묵 설계는 소리 설계만큼 중요하다(여백과 같다). 우선순위는 브랜드 > 히어로 > 알림 > 주요 UX 순이다. 알림은 히어로보다 짧고 여러 번 들어도 괜찮게 만든다[M1†] | 히어로 3종(방 완성·첫 장소·희귀)은 랜덤 없이 늘 같게, UI는 짧고 작게 만든다 |
| Audiokinetic "UI 디자인 관점의 UI 오디오" | 캐주얼 퍼즐에는 강한 물리 피드백이 필요 없어 더 부드러운 UI 소리가 맞는다. 벌칙 소리라도 귀를 찌르면 안 된다. "관용(tolerance)"은 오랜 반복 사용을 전제로 테스트하고 에셋·파라미터를 랜덤화한다는 뜻이다[AK1†] | 실패를 알리는 소리에도 거친 소리를 쓰지 않는다 |
| uxdesign.cc 쾌적함 연재 | 협화음이 쾌적하게 들리는 이유는 처리 유창성 때문이라고 본다. 너무 단순하거나 너무 자주 들으면 쾌감이 줄어든다. **아름다운 소리도 부정적인 의미를 실으면 불편해진다**[UX1†] | failed는 소리를 바꾸는 것만으로 부족하다. 의미도 "오류"가 아닌 "닫힌 문 두드림"으로 서사화한다 |
| 듀오링고 | 정답은 통통 튀는 차임, 오답은 바람 빠지듯 내려가는 톤이라는 제3자 분석만 있고 공식 자료는 찾지 못했다[DU1†⚠] | 이 "오답 어휘"를 우리 게임에서는 쓰지 않는다 |
| 다마고치·네코아츠메·여행 개구리·커비·Finch | 1차 자료를 찾지 못했다⚠ | 다마고치의 "주의 호출 삑삑"은 압박이므로 쓰지 않는다 |
| Juice It or Lose It (GDC EU 2012) | 사건 하나를 색·트윈·소리·파티클 등 여러 채널로 동시에 전한다(프로젝트 스킬 motion-and-feel 참고) | 소리는 모션 토큰 타이밍에 맞춘다(움츠림 600 ms, 귀가 600 ms+200 ms 등) |

### 1.2 조성: F장조를 권한다
- **F를 고른 이유:** (1) F 장 펜타토닉 = D 단 펜타토닉이다. 그래서 I–V–vi–IV(F–C–Dm–B♭)의 vi와 비·밤 단조 변주 어디에서도 같은 SFX를 쓸 수 있다. (2) 종소리 음역 F5–F6(698–1397 Hz)이 폰 스피커가 잘 내는 대역에 들어간다(폰 스피커는 약 300 Hz 아래를 거의 못 낸다⚠). (3) {C D G A}는 F·C·B♭·G장조와 Dm·Am·Gm·Em 모두의 음계 음이다. 테마가 C나 B♭로 전조해도 UI 틱·로그·목소리를 다시 렌더할 필요가 없다.
- **BGM을 C장조로 쓰는 경우:** §4 표 전체를 장4도 아래(−5 반음)로 옮긴다. {C D G A} 집합은 그대로 안전하다.
- **B♭과 E는 쓰는 곳을 정해 둔다.** 등불 4·7칸의 경과음, 우쭐의 V→I 화음에만 쓴다. 나머지는 펜타토닉으로 한정한다.

### 1.3 길이와 빈도
- 길이: UI 틱 20~40 ms, 토글·시트 80~250 ms(UI 모션 250 ms와 같다), 목소리 블립 35~60 ms, peek 200 ms, 이벤트 징글 600~1400 ms, 히어로 1000~2200 ms. 나가는 소리(sheet_close)는 들어오는 소리보다 짧게 한다(모션 토큰 규칙과 같다).
- 무음으로 둘 것: 스크롤, 포커스, 호버, 비활성 탭, 토스트 자동 닫힘, 같은 토글을 1초 안에 연타했을 때의 두 번째부터. 로그 시트가 닫혀 있으면 log_line을 내지 않는다.
- 소리별 최소 간격: ui_tap 60 ms, log_line 120 ms, voice 50 ms, pet 120 ms, window_tap 90 ms. 동시에 나는 소리는 6개까지, 징글은 한 번에 하나다. 더 높은 우선순위가 오면 낮은 것은 1초 안에서 기다리고, 넘으면 버린다.
- 오래 들었을 때의 피로 관리⚠: 10분 동안 대사 블립이 20줄을 넘으면 블립을 두 음절에 하나로 줄인다. 설정에 "목소리: 전부 / 짧게(첫 6음절) / 끔"을 둔다.

### 1.4 음정 랜덤화와 라운드로빈
- 흔히 쓰는 발소리 랜덤 범위는 pitch 0.9~1.1이다[RN2]. 이는 **−182~+165 cent**로, 반음 하나보다 크다. 음 있는 소리에 이렇게 주면 키가 무너진다.
- **우리 범위:** 음 있는 UI·목소리는 음계 음 2~5개 중에서 고르고 ±10~15 cent만 흔든다. 쓰다듬기는 ±20 cent, 노이즈 계열(휙·종이·바스락)은 ±150 cent에 필터 컷오프 ±15%, 음량은 모든 소리에 ±1 dB을 준다. 히어로 징글은 랜덤 없이 늘 같게 둔다[M1†].
- 변형 수: 초당 여러 번 나는 소리는 4~6개, 한 산책에 몇 번 나는 소리는 2~3개(작곡된 변형), 히어로는 1개. 셔플백으로 직전 변형을 다시 내지 않는다[RN1†][AK1†].
- 일부 소리는 반복이 곧 "알아봄"이라서 모든 소리를 랜덤화하지는 않는다[RN1†]. return·room_complete는 고정한다.

### 1.5 음량 위계와 덕킹
| 층 | BGM 대비(dB)* | 해당 소리 | BGM 덕킹 |
|---|---|---|---|
| 히어로 | +2 ~ +4 | room_complete, first_place, rare_sparkle | −6 ~ −9 (앰비언스는 그 절반) |
| 이벤트 징글 | 0 ~ +2 | return, hang_poster, mood×4, lantern 1–7, remember | −3 ~ −4 |
| 이벤트 짧은 소리 | −2 ~ −6 | depart, peek×5, stay_* | 없음(depart 점프만 −2 선택) |
| 목소리 | −6 ~ −8 | voice_blip, curious | 없음. 징글이 나는 동안 블립을 멈춘다 |
| 상호작용 | −6 ~ −10 | pet, window_tap | 없음 |
| UI | −10 ~ −14 | tap, toggle, sheet, toast, card_flip | 없음 |
| 로그·틱 | −14 ~ −18 | log_line, empty_turn | 없음 |
| 앰비언스 베드 | −12(비) ~ −20(맑은 밤) | §3 | BGM이 쉬는 구간에는 +4 |
| 앰비언스 원샷 | −14 ~ −26 | 물방울·귀뚜라미·딱딱 소리 | — |

\*같은 라우드니스 측정(short-term LUFS나 RMS)으로 맞춘 뒤의 상대값이다. 절대 기준: 전체 integrated 약 −18 LUFS(Meta는 단독 −16/PCVR −18을 권하고[LD2], 보통 −16~−20을 권한다[LD3†]. 침대에서 폰으로 하는 게임이라 조용한 쪽을 골랐다), BGM 약 −20 LUFS, true peak ≤ −1 dBTP, 각 SFX 피크 ≤ −6 dBFS. 참고로 Audiokinetic의 콘솔 출발점은 대사 −12, 음악·앰비언스·SFX·UI −16 dB RMS다[LD1†]. 우리는 반복이 가장 많은 UI를 더 낮췄다⚠. 밤(19~6시)에는 마스터를 −3 dB 낮춘다⚠.
- **덕킹:** 사이드체인 툴의 기본값은 어택 10 ms, 릴리스 200 ms, 깊이 −20 dB이고, −6~−12 dB을 "부드러운 낮춤"으로 본다[DK1†]. Wwise 사례에서는 스팅어가 나올 때 음악 버스를 약 −12 dB 내렸다[DK2†]. 우리는 음악이 펌핑하지 않게 **어택 60~80 ms, 릴리스 600~900 ms**로 하고 깊이는 위 표를 따른다. 1초가 넘는 징글은 8분음표 격자(90 BPM에서 ≤333 ms 지연)에 맞춰 시작해도 된다⚠.

### 1.6 감정 어휘: 실패해도 벌하지 않는다
| 의미 | 음정·윤곽 | 음색·음역 | 예 |
|---|---|---|---|
| 기쁨·도착 | 상행 완전4도(C→F)나 장3도(F→A), 으뜸음 F·장3도 A로 끝나는 아르페지오, 옥타브 도약 | P25, 조금 밝게, 0 dB | peek_read, return, 등불 |
| 담담함·열림 | 동음 반복이나 완전5도(F→C)처럼 3음이 없는 음정. 5도 C나 2도 G·6도 D에서 멈춤 | TRI, LPF | 덤덤, empty_turn |
| "아직 아님"(failed·simulated·none) | **리듬·길이는 성공과 같다.** 협화음으로 장2도만 한 걸음 내리거나(D→C) 장2도 올라 매달린다(C→D). 착지는 5도 C에 한다 | TRI나 LPF 1.2 kHz에 에코, −2~−3 dB, 같은 음역 | peek_failed / peek_simulated |
| 졸림 | 펜타토닉 하행이 **으뜸음 F에 해결**된다. 슬픔이 아니라 자장가로 들린다 | TRI, 끝음 −30 cent 처짐, LPF가 서서히 닫힘 | 졸림 |

- **금지:** 단2도·트라이톤·반음계 하강("와와와" 트롬본), 200 Hz 아래의 톱니·사각 버즈, 노이즈 폭발, 3반음 넘는 피치 다이브, 실패에 붙는 비브라토 워블. sfxr의 hitHurt·explosion·laser 프리셋을 그대로 쓰지 않는다(§2.3에서 고친 판만 쓴다).
- **근거:** 상행 음정이 하행보다 더 행복하고 쾌적하게 평가되고, 음정이 클수록 차이가 커진다[R1†]. 장·단조 전환으로 정서가 실린 이어콘을 만들 수 있다[R2†]. 장음정은 들뜬 말소리 스펙트럼과 닮았다는 가설도 있다[R3†]. "실패를 단조로" 만들지 않고 **3음을 빼서 장·단 판단 자체를 피한다**(5도와 2도 사용)는 것은 이 근거에서 끌어낸 설계 판단이다⚠.

### 1.7 캐릭터 목소리 블립(말풍선)
- 흔한 방식: 보이는 글자마다 블립을 내고, 공백·문장부호는 건너뛴다. 블립 사이는 최소 30 ms, 피치는 살짝 랜덤으로 준다(RPG Maker MZ 플러그인[V1†]). N글자마다 하나만 내기도 한다[V2†]. 캐릭터별 최소·최대 피치를 정하는 프로필 방식도 있다[V3†].
- **한글 적용⚠:** 음절 블록 하나에 블립 하나를 낸다. 길이 35~45 ms, 간격은 기분에 따라 50~90 ms로 둔다. **피치는 음절 해시로 정한다.** 같은 낱말은 늘 같은 선율로 들려서 동숲처럼 "말투"가 생긴다. **중성(모음)을 음색에 연결한다:** ㅏㅑ는 P50 LPF 2.4 kHz, ㅗㅛㅜㅠ는 TRI LPF 1.2 kHz(둥근 "뽈"), ㅓㅕㅡ는 P25 LPF 1.6 kHz, ㅣㅔㅐ는 P25 LPF 3 kHz. "?"로 끝나면 마지막 블립을 음계 2도 올리고, "…"는 블립을 내지 않는다(empty_turn 소리만 낸다). 기분별 음 집합은 §4 표 V에 있다.

## 2. sfxr / jsfxr / bfxr / ChipTone 레시피
### 2.1 jsfxr 파라미터와 실제 단위(소스에서 확인)[FX1]
| 파라미터(0..1) | 실제 값 | 예시 |
|---|---|---|
| p_base_freq | f = 3528·(p²+0.001) Hz | 0.3130=F4, 0.3517=A4, 0.4438=F5, 0.4984=A5, 0.5437=C6, 0.6285=F6 |
| p_env_attack/sustain/decay | 초 = 2.268·p² | 0.03→2 ms, 0.05→5.7 ms, 0.1→23 ms, 0.2→91 ms, 0.3→204 ms, 0.4→363 ms, 0.5→567 ms |
| p_freq_ramp(slide, 부호) | 샘플마다 주기 ×(1−0.01p³), 양수면 상승 | 0.05→1 반음/초, 0.1→7.6, 0.15→26, 0.2→61, 0.3→206 반음/초 |
| p_arp_mod(음정 점프 한 번) | 상승 = 12·log₂(1/(1−0.9p²)) 반음 | 장2도 .348, 단3도 .420, **장3도 .479, 완전4도 .528, 완전5도 .608**, 장6도 .671, 옥타브 .745 |
| p_arp_speed | 점프 시점 = ((1−p)²·20000+32)/44100 초 | 0.3→223 ms, 0.5→114 ms, 0.6→73 ms |
| p_duty | 하이 구간 = 0.5−0.5p | 0→50%, 0.5→25%, 0.75→12.5% |
| p_lpf_freq | ≈35280·p³/(1−0.1p³) Hz(1이면 꺼짐) | 0.3→955, 0.35→1.5k, 0.4→2.3k, 0.45→3.2k, 0.5→4.5k, 0.55→6k, 0.6→7.8k |
| p_hpf_freq | ≈35280·p²/(1−0.1p²) Hz | 0.05→88, 0.1→353, 0.15→796 |
| p_vib_strength / speed | 주기 ×(1±0.5p) / ≈70.2·p² Hz | 세기 0.02→±17 cent, 속도 0.3→6.3 Hz |
| p_env_punch | 서스테인 첫머리 +200p%(UI 표기 +100p%와 다르다) | 아늑한 소리에는 0~0.1 |

※ sfxr는 주기를 정수로 자르기 때문에 수 cent 어긋난다. **F장조에 정확히 맞추려면 numpy에서 Hz로 직접 합성**하고, sfxr는 소리 성격을 찾는 스케치용으로만 쓴다.

### 2.2 원본 프리셋의 범위(jsfxr·bfxr 소스)[FX1][FX2]
| 프리셋 | 파형 | base(Hz) | slide | 엔벨로프 | 특이점 |
|---|---|---|---|---|---|
| pickupCoin | 톱니(bfxr는 기본 사각) | .4–.9 (568–2861) | 0 | S 0–.1, D .1–.5 | punch .3–.6. 50% 확률로 arp mod .2–.6, speed .5–.7(=두 번째 음 도약) |
| blipSelect | 사각(duty 0–.6)/톱니 | .2–.6 (145–1274) | 0 | S .1–.2, D 0–.2 | HPF .1 고정 |
| powerUp | 톱니/사각 | .2–.5 | +.05–.5 | S 0–.4, D .1–.5 | 50% repeat .4–.8, 또는 비브라토 0–.7 |
| jump | 사각 duty 0–.6 | .3–.6 (321–1274) | +.1–.3 | S .1–.4, D .1–.3 | HPF·LPF는 각각 50% 확률 |
| hitHurt | 사각/톱니/노이즈 | .2–.8 | −.3~−.7 | S 0–.1, D .1–.3 | 급하강. **우리는 쓰지 않는다** |
| explosion | 노이즈 | (.1–.5)² 등 | −.4~+.3 | S .1–.4, D 0–.5 | punch .2–.8, 페이저 |
| laserShoot | 사각/톱니 | .3–1.0 | −.15~−.65 | S .1–.3, D 0–.4 | duty sweep, 페이저, HPF 0–.3 |
| (bfxr/ChipTone) | 삼각·핑크노이즈 등 파형 추가, bitcrusher·compression 필터[FX3†]. ChipTone(Tom Vian)은 결과물이 CC0이고 Generator 프리셋이 있다[FX4†] | | | | |

### 2.3 아늑하게 고친 레시피(공통: attack .03–.05, punch 0, LPF .45–.55, HPF .05–.1, 볼륨 .25–.4, 페이저·repeat·bitcrush 끔)
| 카테고리 | 아늑한 판 | 수치 |
|---|---|---|
| blip/select → **ui_tap** | TRI(bfxr) 또는 사각 duty .5(=25%) | base .5437(C6), S .03(2 ms), D .1(23 ms), LPF .5, HPF .1 |
| pickup/coin → **반짝 두 음** | 톱니 대신 사각 25% | base .4438(F5), arp mod .479(+장3도=A5) 또는 .528(+4도), arp speed .6(73 ms), S .05, D .3(204 ms), LPF .55 |
| power-up → **등불·포스터 상승** | 사각 25%, slide 대신 arp | base .3838(C5), arp .528(→F5), speed .5, S .1, D .35, 비브라토 세기 .02·속도 .3(끝에만) |
| jump → **문어 폴짝** | 사각 25% | base .3838(C5), slide +.12(약 13 반음/초), S .1(23 ms), D .2(91 ms), LPF .45 |
| hit → **폭신 착지 "퐁"** | TRI | base .22(F3), slide −.05, S .02, D .15(51 ms), LPF .35. 하강 폭을 2 반음 아래로 둬서 아픔이 아닌 "무게"로 들리게 한다 |
| explosion → **먹물 퍼프 "포스스"** | 노이즈 | base .35, slide −.05, A .05, S .05, D .25(142 ms), LPF .35(1.5k), punch 0, 볼륨 .25 |
| laser → **별똥 휘익/휙** | TRI 또는 사각 50% | base .6285(F6), slide −.08, S .05, D .3, LPF .5. 하강 폭은 ≤5 반음으로 하고 C6에서 멈춘다 |

## 3. 날씨·밤 앰비언스
**원리:** 베드는 필터 노이즈로 만들고, 그 위의 사건은 런타임 원샷으로 얹는다. Farnell의 비 패치(Designing Sound, practical 15)를 Max로 옮긴 사람은 "좋게 들리는 건 결국 필터 노이즈"라고 정리했다[AM1†]. CRI 예제는 9초 메인 루프 위에 가중치 원샷을 얹고 피치·팬을 흔든다. 루프 길이의 배수에 맞지 않게 랜덤 오프셋을 주고, "금지 시간"으로 너무 잦은 발생을 막는다[CRI†]. 루프 안에서 눈에 띄는 특징은 빼서 원샷으로 옮긴다[AM2†].
- **루프 길이⚠:** 베드는 47·61·73초처럼 서로 소인 길이로 레이어를 만든다. 조합 주기가 수만 초가 되어 반복이 들리지 않는다(Cicada Principle 류의 유추). 이음매에는 2~3초 크로스페이드를 렌더해 넣는다. OGG/AAC는 인코더 패딩 때문에 `<audio loop>`로 돌리면 틈이 생기므로, decodeAudioData로 버퍼를 만들어 샘플 단위로 루프한다⚠.
- **물방울 물리:** 빗방울 소리는 기포가 공명하는 소리다. 민나에르트 식 f≈6.52/d(mm) kHz를 쓰면 1~3 kHz는 지름 2~6.5 mm 기포에 해당하고, 수십 ms 안에 감쇠한다. 작은 물방울은 약한 광대역 "톡"만 낸다[AM3†]. 위로 올라가는 처프는 단순화한 근사다⚠.
- **바람:** 화이트(핑크) 노이즈를 상태변수·밴드패스 필터에 넣고 느린 랜덤 신호로 컷오프를 움직인다[AM4†]. Web Audio 예시는 LPF 약 350 Hz에 잎사귀 BP를 얹고, 0.2 Hz LFO로 돌풍을 만든다[AM5†].
- **불꽃:** 딱딱(고역 확률 임펄스) + 웅(저역 광대역) + 쉬익(고역 정상 노이즈)의 3층으로 만든다[AM6†]. 쉬익은 불규칙하게 들쭉날쭉해야 진짜 같다[AM7†].
- **귀뚜라미:** 들귀뚜라미 반송 주파수는 3~8 kHz이고 G. bimaculatus는 약 4.5 kHz다[AM8†]. 흰나무귀뚜라미(snowy tree cricket)는 약 2.7 kHz이고 펄스를 2,3,3 묶음으로 낸다[AM9†]. 돌베어 법칙(℃ ≈ 8초 동안의 울음 수 + 5)[AM10]에 따르면 25 ℃에서 초당 약 2.5회 운다. **폰에서 4~5 kHz는 귀를 찌르니 2.8~3.1 kHz로 내리고 음계에 맞춘다.**
- **칩 노이즈의 맛:** NES 노이즈는 15비트 LFSR에 16단계 주기를 쓰고, 짧은 모드(bit 6 탭)는 금속성 소리를 낸다[CH1]. 게임보이 NR43 bit3=1(7비트)은 "톤에 가까운" 노이즈가 된다[CH2]. 비 베드는 15비트 모드를 쓴다. 7비트는 유리 "똑"이나 반짝임에만 아주 조금 쓴다.
- **BGM과 겹치기:** 빗소리가 노이즈 대역을 차지하므로 비·가는 비 변주에서는 BGM 노이즈 채널 드럼을 빼거나 −6 dB 낮추고, 리드를 LPF 4 kHz로 누른다⚠. BGM은 한 루프(2~3분)를 돈 뒤 45~120초 동안 앰비언스만 두고 쉰다. 밤에는 자장가 변주 한 번 뒤로 BGM을 끈다[AC2†][SD1†⚠]. 날씨 전환은 8~12초, 시간대 전환은 60초 크로스페이드로 시각 전환과 맞춘다.

| id | 조건 | 베드 루프 | 레시피 | 레벨(BGM 대비) | 반응 |
|---|---|---|---|---|---|
| amb_rain | rain | 61 s 스테레오 + 원샷 | 핑크 NZ HPF 150 → LPF 3.5k. 쉬익 층은 BP 5k Q0.7 −12. 세기 LFO 0.07 Hz ±1.5 dB. **빗방울**: 포아송 6~10회/s, SIN/TRI 1.5~3.5 kHz, 15 ms에 +20% ↗, D 20~40, 크기 −8~−22 랜덤, 팬 ±0.6. 지붕 톡: TRI 700~900 Hz 8 ms, 1회/s. **처마 물방울(음계)**: C6/D6/F6/G6 TRI, 0.3회/s, ±10 cent | −12 (처마 −16) | window_tap이 오면 처마 물방울 2~3개 추가 |
| amb_drizzle | drizzle | 47 s | 비와 같은 체인에 LPF 2k, 쉬익 층 없음, 베드 −6. 빗방울 1.5~3회/s. **처마 물방울을 앞으로**(0.5회/s, −14). "방울 하나하나가 들리는 날" | −16 | stay_count_drops와 음을 나눠 쓴다 |
| amb_snow_wind | snow | 73 s | 눈 자체는 무음이고 바람만 낸다. 핑크 NZ → BP Q1.5, 중심 350~900 Hz(랜덤워크 LFO 0.06·0.17 Hz). 중심이 오를수록 음량도 같이 올린다(돌풍). 돌풍 15~40초마다. **창틈 휘파람**: BP Q10을 A5나 C6에 맞추고 돌풍 꼭대기에서만 −24. 지붕 눈 미끄러짐 NZ LPF 600 1.2 s, 90초에 한 번꼴. 돌풍 사이에는 거의 고요하게 둔다 | −14 (돌풍 −10) | 등불 따뜻함 층 +2 dB(실내 대비) |
| amb_clear_day | clear, 6~19시 | 53 s | 방 공기 소리: 브라운 NZ LPF 300 −32. **새벽(6~9시) 새**: P12/TRI, 2~3.5 kHz를 빠르게 ↗↘하는 30~60 ms 음절을 2~5개, 8~20초마다 −22. 낮에는 먼 새 20~40초마다 −26. 노을(17~19시)에는 1분에 한 번으로 줄여 사라지게. 나무 삐걱 드물게 | −18 | — |
| amb_clear_night | clear, 19~6시 | 53 s | 방 공기 소리에 **별 반짝**(SIN C7/D7, A5 D120, 10~30초마다 −30, 화면의 별과 맞춤). 새는 없음 | −20 | 마스터 −3 dB |
| amb_summer_night | 6~8(9)월 밤, 맑음·가는 비(큰비에는 멈춤) | 원샷만 | 귀뚜라미 2~3마리: 반송 **F7 2794 / G7 3136 Hz** TRI/SIN, 펄스 18 ms 켬/7 ms 끔, 3펄스 1처프, 처프 2~2.5회/s. 마리마다 60~80% 시간만 울고 쉬다 다시 운다. LPF 5k. **반딧불**: SIN C7/D7을 A300 D500으로 부풀리기만 하고(실제로는 소리가 없으니 "틱"은 금지) −30, 깜빡임과 맞춘다 | −20 (각 마리 −26) | 쓰다듬는 동안 한 마리를 1초 쉬게⚠ |
| amb_autumn | 9~11월 | 원샷만 | 귀뚜라미 1마리, 처프 1.2회/s(서늘함, 돌베어). 잎 바스락: NZ BP 2~5k, 20 ms 낟알 3~8개, 10~25초마다 | −20 | — |
| amb_lantern_warmth | 항상, 등불 n칸(0~8) | 원샷과 41 s 루프 | 딱딱: 포아송 (0.3+0.4n)회/s, 2~5 ms NZ HPF 1.5k, −20~−32 랜덤. 웅: 브라운 LPF 180 Hz (−36+n) dB. 쉬익: BP 4k를 들쭉날쭉하게 −40 | n=8에서 −24 | **방이 채워지는 것이 귀로도 들린다** |

## 4. 이 게임용 SFX 목록(F장조, 45개)
(dB = BGM 대비, 덕킹 = BGM 감쇠량. 모든 펄스 음에는 LPF 6~8 kHz, 어택 ≥2 ms를 기본으로 건다.)

| # | id | 트리거 | ms | 음(F장조) | 레시피 | 변형 | dB | 덕킹 |
|---|---|---|---|---|---|---|---|---|
| 1 | ui_tap | 일반 버튼 탭(주 버튼은 depart가 대신함) | 30 | C6 / D6 | TRI A2 D25, NZ 클릭 3 ms HPF 4k를 −20으로 얹음 | 4 (±10 c) | −12 | — |
| 2 | ui_toggle_on | 토글 켬 | 80 | G5→C6 (4도↑) | TRI 35+45 ms | 2 | −12 | — |
| 3 | ui_toggle_off | 토글 끔 | 80 | C6→G5 (4도↓, 열림) | toggle_on을 뒤집은 것. 부정 아님 | 2 | −13 | — |
| 4 | sheet_open | 바텀시트 열기 | 250 | 꼬리 A5 | NZ LPF 800→3000 Hz 스윕 160 ms(A40) "스윽" + TRI A5 20 ms | 2 | −14 | — |
| 5 | sheet_close | 시트 닫기 | 110 | — | NZ LPF 3000→800 Hz 스윕 110 ms. 음 없음, 열 때보다 짧게 | 2 | −15 | — |
| 6 | toast | 토스트 | 300 | A5→D6 / G5→C6 | TRI 50 ms → 250 ms 지수 감쇠 "플링" | 2 | −12 | — |
| 7 | log_line | 로그 한 줄(peek 아닌 줄) | 20 | C6·D6 중 | NZ 틱 4 ms HPF 2k + TRI 15 ms. 최소 간격 120 ms, 시트가 닫혀 있으면 무음 | 4 | −16 | — |
| 8 | card_flip | 포스터 카드 뒤집기 | 120 | F5 | NZ BP 1.5~4k 두 번 30 ms 간격 "팔락" + TRI F5 20 ms | 2 | −14 | — |
| 9 | audio_on | 🔈 처음 켬 | 400 | F5 A5 C6 | P25 50 ms씩 + 꼬리 250 ms. "안녕" | 1 | −8 | — |
| 10 | voice_blip | 말풍선 음절 | 40/음절 | 표 V | 표 V. 중성(모음)마다 음색, 음절 해시로 음 선택, ±12 c, A3 D35 | 모음 4계열 | −6 | — |
| 11 | curious | 바라보기, 창문 반응 "?" | 140 | A4→D5 (4도↑) | voice_blip 두 개, 둘째에 +20 c ↗ | 2 | −8 | — |
| 12 | depart_windup | 출발·집에 있기 공통 움츠림(600+200 ms 정지) | 800 | F4↘C4 | TRI 500 ms 동안 −5 반음 슬라이드, LPF 900 "우우웅" 뒤 200 ms 무음 | 1 | −10 | — |
| 13 | depart_leave | 호를 그리며 퇴장 + 먹물 퍼프 | 900 | C5↗F5 | P25 점프(§2.3 jump) 150 ms. 이어서 NZ BP 2k→600 Hz 600 ms(멀어질수록 어둡게) −14. 퍼프: NZ LPF 1.2k A5 D150 −12. 기포 SIN 900→1300 Hz 40 ms ×2 | 3 (기포 음) | −4 | −2(선택) |
| 14 | peek_read | 기웃: 읽음 | 200 | C5→F5 (+A5) | **기준 리듬 60+140 ms.** P25, 둘째 음 시작에 P12 A5 반짝을 −15로 | 3 (C→F, A→C→F, D→F) | −4 | — |
| 15 | peek_builtin | 기웃: 책장 메모 | 200 | A4→C5 | 같은 리듬. TRI("나무") + NZ BP 2~4k 40 ms "책장 넘김" | 2 | −5 | — |
| 16 | peek_simulated | 기웃: 모의 방문(문 앞까지) | 200(+에코) | C5→D5 (매달림) | 같은 리듬. P50 LPF 1.2k + 에코 90 ms −9 dB 두 번 "문 너머" | 2 | −6 | — |
| 17 | peek_failed | 기웃: 못 읽음 | 200 | D5→C5 (5도에 착지) | 같은 리듬. TRI, 앞에 똑똑 노크(TRI C4 25 ms ×2, 110 ms 간격, −10). 버즈·하강 다이브 없음 | 2 | −6 | — |
| 18 | peek_none | 앉아만 있음 | 200 | F4 (또는 C4+F4) | 같은 길이에 음 하나. TRI A40, 숨결 NZ LPF 800 −20 | 2 | −8 | — |
| 19 | return_home | 귀가(600+200 ms 정착) | 900 | C5→F5 | NZ BP 600→2k ↗ 400 ms(다가올수록 밝게). 정착 순간 "퐁"(§2.3 hit 고친 판) TRI F3+F4 60 ms. P25 C5 80 → F5 220 ms | 3 (C→F, A→C→F, C→F→A) | 0 | −3 |
| 20 | remember | 기억 정리 | 900 | 표 R | TRI 아르페지오 + 딜레이 180 ms, 피드백 −6 dB ×3, LPF 2.5k. 장소마다 모티프 | 12 (장소) | −2 | −3 |
| 21 | hang_poster | 포스터 걸기(500 ms 상승, 스티커는 150 ms 늦게) | 1100 | F5 A5 C6 | 0 ms: NZ BP 1~3k 200 ms 종이 소리. 500 ms: 핀 "톡"(TRI C6 15 ms + 클릭). 650 ms: 스티커 P25 A5↗C6 60 ms 뒤 F5·A5·C6을 30 ms 간격으로 펼친 화음, D400 | 2 | 0 | −4 |
| 22 | lantern_1~7 | 등불 n칸 켜짐 | 700 | F5 G5 A5 B♭5 C6 D6 E6 | 앞 칸 음 두 개를 40 ms 꾸밈음으로 −9 → 본음 TRI + P25 옥타브 위 −12(반짝), A3 D600. "화륵" NZ LPF 1k 120 ms −18 | 7 (음) | +1 | −3 |
| 23 | lantern_8_room | 8칸 = 방 완성(히어로) | 2200 | F5 G5 A5 C6 → F6 + F·A·C | 0~300 ms: P25 F5 G5 A5 C6 60 ms씩. 300~1100 ms: F6 종 + 화음 F5/A5/C6을 칩 아르페지오(16.7 ms 순환), 베이스 TRI F3→F2. 1100~2200 ms: P12 반짝 C7·D7·F7 25 ms ×6을 −18로, 꼬리는 LPF가 닫히며 끝남 | 1 (고정) | +4 | −9 |
| 24 | first_place | 처음 가 본 곳 | 1200 | F5 G5 A5 C6 D6 F6 | P25 45 ms씩 상행 → F6 600 ms, 150 ms 뒤부터 비브라토 6 Hz ±20 c. 베이스 TRI F4→C5 | 1 (고정) | +2 | −6 |
| 25 | rare_sparkle | 희귀 티어(1/6) | 1000 | F6 A6 C7 | P12/P25 칩 아르페지오 화음 500 ms, LPF 6k. 반짝 {C7 D7 F7} P12 25 ms ×6을 −16, 랜덤 시각. room과 겹치면 400 ms 뒤로 미룬다 | 1 (고정) | +2 | −6 |
| 26 | mood_poljjak | 반응: 폴짝(신남) | 700 | C5 F5 A5 → C6↗ | P25 스타카토 70 ms+쉼 40 ms ×3, 끝음은 +1 반음 ↗↘ "뿅" 220 ms(jump 고친 판) | 2 (F5 A5 C6 F6) | +1 | −4 |
| 27 | mood_ujjul | 반응: 우쭐(뿌듯) | 800 | [C5+E5]→[F5+A5] (V→I) | P50 두 화음 160 / 500 ms, 끝 화음 200 ms 뒤부터 비브라토 ±15 c "에헴". 베이스 TRI C4→F3 | 2 | +1 | −4 |
| 28 | mood_deomdeom | 반응: 덤덤 | 700 | F4→C5 (열린 5도) | TRI A15, 250+450 ms, 비브라토 없음. "음, 그렇구나" | 2 (A4 A4 동음) | −1 | −3 |
| 29 | mood_jollim | 반응: 졸림 | 1300 | D5 C5 A4 F4 (으뜸음 해결) | TRI 200/200/250/600 ms. 끝음은 −30 c로 처지고 LPF 3k→800. 하품 숨결 NZ | 2 | −1 | −3 |
| 30 | sleep_settle | 잠듦 | 800 | F3 | 이불 NZ LPF 1.5k 400 ms + TRI F3 허밍 페이드. 이어서 snore | 1 | −8 | BGM 페이드아웃 3 s |
| 31 | snore_loop | 자는 동안 | 3.7/4.1/4.6 s 순환 | (C5→A4) | 들숨 NZ BP 400→900 Hz 1.4 s → 0.3 s 멈춤 → 날숨 NZ LPF 600 1.6 s. 두 번에 한 번 TRI "푸우" C5↘A4 −26 | 3 (길이) | −18 | — |
| 32 | stay_settle | 집에 있기로 함(같은 움츠림, 다른 결말) | 600 | C4↗F4, F5+A5 | TRI +5 반음 ↗(windup을 되돌림, 1.03 오버슈트와 맞춤) + "폭신" NZ LPF 500 80 ms + 장3도 차임 400 ms | 2 | −4 | — |
| 33 | stay_count_drops | 창가에서 빗방울 세기 | 방울 하나 40 ms | C6 D6 F6 G6 (하나씩 위로) | TRI, +40 c ↗ 처프, 방울마다 400~600 ms 간격. 맑은 밤에는 P12로 "별 세기" | 날씨 2 | −8 | — |
| 34 | stay_tidy | 정리 | 450 | — | 나무 딱: TRI 600/800 Hz 10 ms + NZ 클릭, 3타 리듬 | 3 | −10 | — |
| 35 | stay_hum | 창가 흥얼 | 1600 | A4 C5 D5 C5 A4 | voice_blip 음색(ㅜ 계열)으로 BGM 동기 조각을 느리게 | 2 | −10 | −2 |
| 36 | empty_turn | 빈 차례 "…" | 750 | C5 C5 C5 | TRI 25 ms를 0/350/700 ms에 −16/−19/−22. 같은 음이라 하강 없음. 50%는 무음 | 2 | −16 | — |
| 37 | pet_stroke | 쓰다듬기 한 번 | 90 | D5 F5 G5 A5 C6 순서, C6에서 멈춤 | TRI + P50 −12, +30 c ↗. 1.5초 쉬면 처음으로. **점수나 콤보처럼 들리지 않게 상한을 둔다** | 4 (±20 c) | −8 | — |
| 38 | pet_happy | (11-15 안 씀, 주인 C3 b: 기쁨 소리 없음) 예전: 3번 넘게 쓰다듬은 뒤(10초에 한 번) | 150 | D5↗F5, A5 | P12 "뀨" 80 ms + A5 60 ms | 2 | −6 | — |
| 39 | window_tap | 창문 두드리기 | 80 | A6 / G6 | TRI 70 ms + NZm BP 2.5k 15 ms "똑". 두 번 탭하면 "똑똑". 비·가는 비에서는 80~200 ms 뒤 처마 물방울 2~3개 | 4 (±15 c) | −10 | — |
| 40 | depart_rain_extra | 비 오는 날 출발 덧소리 | 300 | C6 D6 | 퍼프 뒤 물방울 2개(amb 빗방울 음색) | 2 | −14 | — |
| 41 | discovery_place_motif | first_place 뒤에 장소 모티프 | 600 | 표 R | remember 모티프를 P25로 한 번 | 12 | −2 | (first에 포함) |
| 42 | lantern_prop_fade | 등불 200 ms 뒤 소품이 나타남 | 250 | 장3도 위 음 | TRI −16, 짧은 반짝 | 1 | −16 | — |
| 43 | weather_shift | 날씨 전환(8~12 s 크로스페이드 시작) | 400 | — | 음 없음. 새 베드 쪽 NZ 필터를 0.4 s 열어 "바뀌었다"를 알림 | 1 | −18 | — |
| 44 | dawn_chime | 새벽 6시 첫 진입(하루 한 번) | 900 | C5 F5 G5 C6 | TRI 아주 작게 + 새 한 마리. 시간 알림이 아니라 장면 신호 | 1 | −12 | −2 |
| 45 | album_open | 앨범·벽 보기 | 250 | F5 A5 | sheet_open 변형 + 두 음 | 1 | −13 | — |

**표 V · 목소리 음 집합(기분별)⚠:** idle {A4 C5 D5} 60 ms/음절 · 폴짝 {C5 D5 F5 G5} 50 ms, 끝에 +1단 · 우쭐 {C5 F5 A5} 65 ms, 끝음 1.5배 길게 · 덤덤 {A4 C5} 70 ms · 졸림 {F4 G4 A4} 90 ms, 두 음절에 하나, LPF 1.5k · 쓰다듬기 {D5 F5} +비브라토 · curious: 끝 +2단.
**표 R · 장소 모티프(remember·discovery)⚠:** hands 손과 물건: 나무 톡톡 + C5 F5 · sea: 기포 SIN ↗ + A4 C5 F5 · sky: F5 C6(5도) + 바람 · signs: P25 타자 D5 F5 · numbers: F5 G5 A5(하나 둘 셋) · sounds: C5 쉼 C5 F5(당김음) · home: TRI 화음 F4 A4 C5 · mind: 에코 A5 F5 C6 + 비브라토 · wild: C5 G5 D6(멀리 도약) · slow_room: F4 … C5 900 ms · letter_room: 종이 소리 + A4 하나(항상 비어 있음, 중립) · door_out: 똑똑 + C5 D5(simulated와 같은 색).

**구현 메모⚠:** 버스 5개(bgm / amb / sfx_event / sfx_ui / voice)를 각각 GainNode로 두고, 덕킹은 bgm·amb 버스 게인을 setTargetAtTime으로 조절한다. 음량 설정은 마스터·음악·효과·환경 슬라이더에 목소리 토글을 더한다. 모든 랜덤(변형·물방울·귀뚜라미)은 프로젝트의 시드 PRNG를 쓰고, 오디오에도 `Math.random`을 쓰지 않는다(재현 가능한 하루). 기존 곡의 징글은 따라 하지 않는다. 방 완성은 4음 펜타토닉 상행 + 화음으로, 젤다 아이템·FF 승리·마리오 클리어와 리듬과 윤곽이 다르다.

## 5. 출처
- [AC1†] Nookipedia, Animalese / Bebebese: https://nookipedia.com/wiki/Animalese , https://nookipedia.com/wiki/Bebebese
- [AC2†] CEDEC 2020 토다카·후지카와 강연 기사: https://www.famitsu.com/news/202009/08205356.html , https://news.denfaminicogamer.jp/kikakuthetower/200906b
- [AC3†] 날씨별 시간대 BGM: https://nookipedia.com/wiki/Rain , https://nookipedia.com/wiki/Snow , https://animalcrossing.fandom.com/wiki/Weather
- [C1†] Celeste 대사 오디오(K. Regamey): https://shacknews.com/article/125697/devs-share-insight-into-celestes-dialogue-design-process , https://www.thegamer.com/celeste-sound-designer-reveals-how-the-games-dialogue-audio-was-created/ , https://threadreaderapp.com/thread/1416483583053602816.html , FMOD 프로젝트 https://www.fmod.com/docs/studio/appendix-a-celeste.html
- [U1†] Unpacking 폴리(GDC 2022, J. van Dyck): https://www.gamedeveloper.com/marketing/auditory-tales-from-the-making-of-zen-puzzler-unpacking , https://blog.audiokinetic.com/en/unpacking-the-fun-behind-the-foley/ , https://www.nme.com/news/unpacking-features-over-14000-sound-effect-files-3087521 , https://gdcvault.com/play/1027728
- [MA1†] Musical Sound Effects in the Super Mario Series: https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94
- [TU1†] Audiokinetic, Tuning your Game (Gagnon, MIGS17): https://blog.audiokinetic.com/tuning-your-game-music-theory-for-sound-design/
- [P1†] 포켓몬 아이템 징글이 BGM을 끊음: https://pokemondb.net/pokebase/235413/why-does-my-game-freeze , https://hsmusic.wiki/track/obtained-an-item-pokemon-sword-shield
- [SH1] A Short Hike 적응형 음악: https://en.wikipedia.org/wiki/A_Short_Hike , https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/
- [SD1†⚠] 스타듀 밸리 비·밤 앰비언트 동작(포럼): https://forums.stardewvalley.net/threads/bug-rain-sound-does-not-play-when-teleporting-from-ginger-island-to-farm.7813 ; 1인 개발로 SFX까지 제작: https://stardewvalleywiki.com/Eric_Barone
- [M1†] Material Design 사운드: https://m2.material.io/design/sound/applying-sound-to-ui.html , https://m2.material.io/design/sound/sound-choreography.html , https://m2.material.io/design/sound/about-sound.html
- [AK1†] Audiokinetic, Approaching UI Audio from a UI Design Perspective 1·2: https://www.audiokinetic.com/en/blog/approaching-ui-audio-ui-design-perspective-1 , https://www.audiokinetic.com/en/approaching-ui-audio-ui-design-perspective-2
- [UX1†] uxdesign.cc 쾌적함·불쾌함 연재: https://uxdesign.cc/safe-and-sound-a-few-thoughts-on-pleasantness-in-videogame-sound-effects-ffe4240ffc50 , https://uxdesign.cc/deconstructing-unpleasantness-in-videogame-sound-effects-part-2-practice-6ea6518d41f6
- [DU1†⚠] 듀오링고 피드백 소리(제3자): https://out-of-scope-product.beehiiv.com/p/duolingo-has-it-venmo-has-it-even-slack-has-it-your-product-doesn-t
- [R1†] Luke & Cowan 2025, The Ups and Downs of Melodic Interval Appreciation: https://labs.sonicfield.org/library/the-ups-and-downs-of-melodic-interval-appreciation ; Gerardi & Gerken 1995: https://experts.arizona.edu/en/publications/the-development-of-affective-responses-to-modality-and-melodic-co/
- [R2†] Lemmens 2005, 장·단조로 정서 이어콘 만들기: https://repository.gatech.edu/entities/publication/c88463b1-6398-4bb7-ba52-917e0a38a303 ; [R3†] Bowling et al. 2010(JASA), 위 R1·R2 검색 요약에서 재인용
- [RN1†] 반복 피로·라운드로빈: https://bugnet.io/blog/how-to-make-ui-sounds-satisfying , https://www.asoundeffect.com/game-audio-immersion/ ; [RN2] pitch 0.9~1.1 관행: https://discussions.unity.com/t/foot-step-audio-randomize-pitch/26725
- [V1†] RPG Maker MZ Dialogue Bleep(≥30 ms, 공백 건너뜀, 피치 랜덤): https://winterbitestudios.itch.io/plugin-rpg-maker-mz-dialogue-bleep ; [V2†] https://devforum.roblox.com/t/think-it-would-be-possible-to-make-speech-bubbles-have-pixel-voices/3055854 ; [V3†] https://docs.sillytavern.app/extensions/blip/ ; 참고 https://geolojosh.itch.io/goodlands/devlog/314373/how-to-animal-crossing-dialogue-sounds
- [LD1†] Audiokinetic 라우드니스 3장(RMS 기준): https://blog.audiokinetic.com/loudness-processing-best-practice-chapter-3-scalable-loudness-processing-for-games/ ; [LD2] Meta 라우드니스: https://developers.meta.com/horizon/documentation/unreal/audio-loudness-meter-overview/ ; [LD3†] https://bugnet.io/blog/how-loud-should-your-game-be
- [DK1†] 사이드체인 덕킹 기본값: https://composer-docs.vindral.com/operators/operators-sidechain-ducking.html ; [DK2†] Wwise 스팅어 −12 dB: https://www.audiokinetic.com/qa/2672/crossfading-stingers
- [FX1] jsfxr 소스(단위·프리셋, 직접 읽음): https://github.com/chr15m/jsfxr (sfxr.js) ; [FX2] bfxr 생성기(직접 읽음): https://github.com/increpare/bfxr ; [FX3†] https://rekkerd.org/bfxr-free-sound-fx-generator-by-increpare/ ; [FX4†] ChipTone: https://sfbgames.itch.io/chiptone ; pyfxr: https://pyfxr.readthedocs.io/en/stable/generating.html
- [CRI†] CRI, Ambience Design in Atom Craft 1: https://blog.criware.com/index.php/2020/12/14/ambience-design-in-atom-craft-part-1-2/
- [AM1†] Farnell 비 패치 논의: https://cycling74.com/forums/analysis-and-resynthesis-of-rain-sounds (패치 http://aspress.co.uk/sd/practical15.html) ; [AM2†] https://freesound.org/forum/off-topic/43134 , https://zapsplat.com/?p=66837
- [AM3†] 기포·빗방울 음향: https://research.cs.cornell.edu/Sound/bubbles/bubbles.pdf , https://earthobservatory.nasa.gov/features/Rain/rain_2.php , https://docs.rs/crate/garjan/1.0.0/source/src/bubble.rs
- [AM4†] JSyn WindSound: https://www.softsynth.com/jsyn/docs/WindSound.txt , https://lists.linuxaudio.org/pipermail/linux-audio-user/2004-October/016511.html ; [AM5†] https://noisescap.vercel.app/how-it-works
- [AM6†] 불꽃 3층 모델: https://docs.rs/crate/garjan/1.0.0/source/src/fire.rs ; [AM7†] https://elifia-muthia.github.io/computational-sound/hw3/main.html ; https://www.cs.cornell.edu/projects/Sound/fire/
- [AM8†] 귀뚜라미 반송 주파수: https://conductscience.com/species/cricket/calling-song-production-analysis , https://cob.silverchair.com/jeb/article-pdf/1276968/2569.pdf ; [AM9†⚠] Singing Insects of North America(종 페이지 확인 안 됨): https://orthsoc.org/sina/588a.htm ; [AM10] https://en.wikipedia.org/wiki/Dolbear%27s_law
- [CH1†] NES APU: https://www.nesdev.org/apu_ref.txt ; [CH2†] Game Boy 노이즈: https://gbdev.io/pandocs/Audio_details.html , https://gbdev.gg8.se/wiki/articles/Gameboy_sound_hardware
- 아늑한 사운드 연구(초록만): https://www.springerprofessional.de/en/sounds-safe-an-initial-investigation-into-the-potential-of-sound/51779774 ; UI 오디오 GDC: https://gamedev.net/news/5816-what-was-that-noise-mastering-creative-ui-sound-design-with-intention/ , https://schedule.gdconf.com/session/civilization-vii-impactful-ui-sound-design-at-scale/915690 ; Juice It or Lose It: https://www.youtube.com/watch?v=Fy0aCDmgnxg
