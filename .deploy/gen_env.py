import secrets, paramiko

HOST, USER, PASS = "155.212.164.251", "root", "Vjq_Ytdthjznysq_Gjhjkm1448"
REMOTE_ENV = "/opt/lesovik/repo/infra/.env"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    _in, out, err = cli.exec_command(cmd, timeout=120)
    o = out.read().decode(errors="replace")
    e = err.read().decode(errors="replace")
    code = out.channel.recv_exit_status()
    return code, o, e

# 1) generate RSA keypair on server into /tmp
run("rm -f /tmp/jp.pem /tmp/jpub.pem")
code, o, e = run("openssl genrsa -out /tmp/jp.pem 2048 && openssl rsa -in /tmp/jp.pem -pubout -out /tmp/jpub.pem")
assert code == 0, f"openssl failed: {e}"

# 2) read exact bytes via SFTP (no shell mangling)
sftp = cli.open_sftp()
with sftp.open("/tmp/jp.pem") as f:
    priv = f.read().decode()
with sftp.open("/tmp/jpub.pem") as f:
    pub = f.read().decode()

priv_1l = priv.strip().replace("\n", "\\n")
pub_1l = pub.strip().replace("\n", "\\n")

pg = secrets.token_hex(16)
secret = secrets.token_hex(32)
s3acc = secrets.token_hex(8)
s3sec = secrets.token_hex(24)

env = f"""APP_ENV=production
DEBUG=false
SECRET_KEY={secret}
DATABASE_URL=postgresql://app_user:{pg}@postgres:5432/nocode
POSTGRES_PASSWORD={pg}
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
JWT_PRIVATE_KEY={priv_1l}
JWT_PUBLIC_KEY={pub_1l}
JWT_ALGORITHM=RS256
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY={s3acc}
S3_SECRET_KEY={s3sec}
S3_BUCKET_FILES=nocode-files
S3_BUCKET_EXPORTS=nocode-exports
S3_REGION=us-east-1
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@lesovik.local
CORS_ORIGINS=http://155.212.164.251:8090
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
SEED_ADMIN_EMAIL=admin@nocode.local
SEED_ADMIN_PASSWORD=Lesovik!Admin2026
SEED_ADMIN_NAME=Platform Admin
"""

with sftp.open(REMOTE_ENV, "w") as f:
    f.write(env)
sftp.chmod(REMOTE_ENV, 0o600)
run("rm -f /tmp/jp.pem /tmp/jpub.pem")

# verify: env must be exactly 27 lines, keys single-line
code, o, e = run(f"wc -l < {REMOTE_ENV}; grep -c '^JWT_PRIVATE_KEY=' {REMOTE_ENV}; awk -F= '/^JWT_PRIVATE_KEY=/{{print length($2)}}' {REMOTE_ENV}")
print("lines / jwt-priv-line-count / jwt-priv-value-len:")
print(o.strip())
sftp.close()
cli.close()
print("DONE")
