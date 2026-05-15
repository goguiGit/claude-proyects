import subprocess
import sys
import time


def free_port(port: int) -> None:
    """Kill any process occupying the given port (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            if f":{port} " in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                subprocess.run(["taskkill", "/F", "/PID", pid],
                               capture_output=True)
                print(f"  Released port {port} (PID {pid})")
    except Exception:
        pass


def main():
    print("Checking ports...")
    free_port(8000)
    free_port(8501)
    time.sleep(1)

    print("Starting API on http://localhost:8000 ...")
    api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "src.main:app", "--port", "8000", "--reload"]
    )

    time.sleep(2)

    print("Starting dashboard on http://localhost:8501 ...")
    ui = subprocess.Popen(
        [sys.executable, "-m", "streamlit", "run", "app_ui.py"]
    )

    print("\nBoth services running. Press Ctrl+C to stop.\n")
    try:
        api.wait()
        ui.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        api.terminate()
        ui.terminate()


if __name__ == "__main__":
    main()
