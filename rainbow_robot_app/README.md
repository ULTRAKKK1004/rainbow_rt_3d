# Rainbow Robotics 3D Sync & Control

이 프로그램은 Rainbow Robotics RB5-850E 로봇을 제어하고 3D 가상 환경(Three.js)과 실시간으로 동기화하는 예제입니다.

## 주요 기능
- **실시간 동기화**: 로봇의 포트 5001(Data Port)을 통해 관절 각도를 읽어 3D 모델에 반영합니다.
- **로봇 제어**: 웹 인터페이스에서 각도를 입력하여 포트 5000(Command Port)으로 `move_j` 명령을 전송합니다.
- **시뮬레이션 모드**: 실제 로봇이 없어도 `mock_robot.py`를 통해 기능을 테스트할 수 있습니다.

## 실행 방법

### 1. 가상 로봇 서버 실행 (선택 사항)
실제 로봇이 없는 경우 다음 명령으로 로봇 시뮬레이터를 실행합니다.
```bash
python rainbow_robot_app/mock_robot.py
```

### 2. 메인 서버 실행
가상 또는 실제 로봇과 웹 브라우저를 연결하는 브릿지 서버를 실행합니다.
```bash
python rainbow_robot_app/server.py
```
*실제 로봇을 사용하는 경우 `server.py` 파일 상단의 `ROBOT_IP`를 로봇의 IP 주소로 수정하세요.*

### 3. 웹 인터페이스 접속
브라우저에서 다음 주소로 접속합니다.
`http://localhost:8000`

## 기술 스택
- **Backend**: Python (socket, http.server)
- **Frontend**: Three.js (3D Visualization), ColladaLoader
- **Robot Protocol**: TCP/IP Port 5000 (Command), Port 5001 (Data)
