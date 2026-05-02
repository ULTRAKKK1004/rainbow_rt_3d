# Rainbow Robotics RB5-850E 3D Control & Sync System

이 프로젝트는 Rainbow Robotics의 협동로봇(RB 시리즈)을 위한 실시간 3D 디지털 트윈 및 제어 인터페이스입니다. 실제 로봇의 상태를 3D 환경과 동기화하고, 웹 인터페이스를 통해 원격 제어할 수 있는 환경을 제공합니다.

---

## 1. 시스템 아키텍처

- **Robot**: Rainbow Robotics RB5-850E (TCP/IP 제어 모드)
- **Backend (Python)**: 로봇과 소켓 통신(Port 5000, 5001)을 수행하고 웹 프론트엔드에 데이터를 전달하는 브릿지 서버
- **Frontend (Web)**: Three.js 기반의 3D 시각화 및 사용자 제어 인터페이스
- **Mock Simulator**: 실제 로봇 없이 테스트 가능한 가상 로봇 서버 포함

---

## 2. 사전 준비 (Setup)

### 하드웨어 설정 (실제 로봇 사용 시)
1. **네트워크 연결**: 제어용 PC와 로봇 제어 박스를 LAN 케이블로 연결합니다.
2. **IP 설정**: PC의 IP를 로봇과 동일한 대역(예: `10.0.2.100`)으로 설정합니다. (로봇 기본 IP: `10.0.2.7`)
3. **제어 모드**: 로봇 티칭 펜던트에서 **TCP/IP 제어 모드**를 활성화해야 합니다.

### 소프트웨어 설치
현재 프로젝트 구조는 별도의 외부 라이브러리 설치 없이 Python 3.x 기본 환경에서 동작하도록 설계되었습니다.
```bash
# 저장소 클론
git clone https://github.com/ULTRAKKK1004/rainbow_rt_3d.git
cd rainbow_rt_3d
```

---

## 3. 실행 방법

### Case A: 시뮬레이션 모드 (실제 로봇이 없는 경우)

1. **가상 로봇 실행**: 로봇 하드웨어 역할을 하는 시뮬레이터를 먼저 실행합니다.
   ```bash
   python rainbow_robot_app/mock_robot.py
   ```
2. **제어 서버 실행**: 웹과 로봇을 연결하는 서버를 실행합니다.
   ```bash
   python rainbow_robot_app/server.py
   ```
3. **웹 접속**: 브라우저에서 `http://localhost:8000`에 접속합니다.

### Case B: 실제 로봇 연동

1. **IP 주소 수정**: `rainbow_robot_app/server.py` 파일을 열어 상단의 `ROBOT_IP`를 실제 로봇의 IP로 수정합니다.
   ```python
   ROBOT_IP = '10.0.2.7' # 실제 로봇 IP
   ```
2. **제어 서버 실행**:
   ```bash
   python rainbow_robot_app/server.py
   ```
3. **웹 접속**: 브라우저에서 `http://localhost:8000`에 접속하여 실시간 동기화 상태를 확인합니다.

---

## 4. 사용 방법 (Web UI)

- **3D View**: 마우스 왼쪽 버튼(회전), 오른쪽 버튼(이동), 휠(확대/축소)을 사용하여 로봇 모델을 관찰합니다.
- **Control Panel**: 좌측 입력창에 원하는 관절 각도(Degree)를 입력하고 **Send Move Command** 버튼을 누릅니다.
- **Real-time Sync**: 로봇이 움직이면 가상 환경의 3D 모델도 실시간으로 따라 움직이며, 현재 각도가 하단에 표시됩니다.

---

## 5. 주요 통신 프로토콜 정보

- **Port 5000 (Command)**: ASCII 기반 스크립트 전송 (예: `move_j(0,0,0,0,0,0,100,100)`)
- **Port 5001 (Data)**: 바이너리 기반 실시간 상태 데이터 수신 (`reqdata` 명령 사용)
  - 헤더(4 bytes): `$`(0x24) + Size(2 bytes) + Type(1 byte)
  - 페이로드: 관절 각도는 특정 오프셋(56 bytes 이후)에서 Double(8 bytes) 형식으로 읽어옵니다.

---

## 6. 라이선스 및 리소스 출처
- 로봇 3D 모델(.dae): Rainbow Robotics 공식 ROS 2 패키지(`rbpodo_ros2`)에서 추출되었습니다.
- 모든 코드는 교육 및 연구 목적으로 제작되었습니다.
