import sys, paramiko, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "155.212.164.251"
USER = "root"
PASS = "Vjq_Ytdthjznysq_Gjhjkm1448"

def main():
    cmd = sys.stdin.read() if "--stdin" in sys.argv else " ".join(sys.argv[1:])
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASS, timeout=30, banner_timeout=30, auth_timeout=30)
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=600)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    sys.stdout.write(out)
    if err.strip():
        sys.stderr.write("\n--- STDERR ---\n" + err)
    sys.stdout.write(f"\n--- EXIT {code} ---\n")
    cli.close()
    sys.exit(code)

if __name__ == "__main__":
    main()
