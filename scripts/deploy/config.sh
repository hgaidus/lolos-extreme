# Shared by the deploy scripts. Sourced, not run.
SSH_HOST="green139@cross-country-trips.com"
SSH_PORT=2222
SSH_KEY="$HOME/.ssh/inmotion_ccrv"
SSH_OPTS=(-p "$SSH_PORT" -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=20)
SCP_OPTS=(-P "$SSH_PORT" -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=20 -q)
