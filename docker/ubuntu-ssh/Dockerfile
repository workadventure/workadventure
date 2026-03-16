FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssh-server \
        sudo \
        ca-certificates \
        curl \
        git \
        zsh \
        vim \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash ubuntu \
    && passwd -d ubuntu \
    && mkdir -p /var/run/sshd /home/ubuntu/.ssh /workspace \
    && chown -R ubuntu:ubuntu /home/ubuntu/.ssh /workspace \
    && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

COPY docker/ubuntu-ssh/sshd_config /etc/ssh/sshd_config
COPY docker/ubuntu-ssh/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]
