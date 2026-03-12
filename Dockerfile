# ════════════════════════════════════════════════════════════════════
# Repo2APK - Production Dockerfile
# Android SDK + Flutter + Node.js build environment
# ════════════════════════════════════════════════════════════════════

FROM ubuntu:22.04

LABEL maintainer="Repo2APK"
LABEL description="Full Android build environment for Repo2APK"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# ─── System Dependencies ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    build-essential \
    curl \
    wget \
    unzip \
    zip \
    git \
    # Java (OpenJDK 17 for Android)
    openjdk-17-jdk \
    # Python (for some build scripts)
    python3 \
    python3-pip \
    # Network tools
    ca-certificates \
    gnupg \
    # File tools
    file \
    xz-utils \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# ─── Java Environment ─────────────────────────────────────────────────────────
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# ─── Node.js 20 LTS ───────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# ─── Android SDK ──────────────────────────────────────────────────────────────
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin

# Download Android Command Line Tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip \
    -O /tmp/cmdtools.zip && \
    unzip -q /tmp/cmdtools.zip -d /tmp/cmdtools && \
    mv /tmp/cmdtools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest && \
    rm -rf /tmp/cmdtools /tmp/cmdtools.zip

# Accept licenses and install SDK components
RUN yes | sdkmanager --licenses > /dev/null 2>&1 || true && \
    sdkmanager --update && \
    sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "platforms;android-33" \
    "build-tools;34.0.0" \
    "build-tools;33.0.2" \
    "build-tools;30.0.3"

# ─── Gradle (standalone, for cache) ───────────────────────────────────────────
ENV GRADLE_VERSION=8.4
ENV GRADLE_HOME=/opt/gradle/gradle-${GRADLE_VERSION}
ENV PATH=$PATH:$GRADLE_HOME/bin

RUN wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip \
    -O /tmp/gradle.zip && \
    mkdir -p /opt/gradle && \
    unzip -q /tmp/gradle.zip -d /opt/gradle && \
    rm /tmp/gradle.zip

# Pre-cache Gradle dependencies (common versions)
RUN gradle --version

# ─── Flutter SDK ──────────────────────────────────────────────────────────────
ENV FLUTTER_HOME=/opt/flutter
ENV PATH=$PATH:$FLUTTER_HOME/bin

RUN git clone --depth 1 --branch stable https://github.com/flutter/flutter.git $FLUTTER_HOME && \
    flutter config --no-analytics && \
    flutter precache --android && \
    dart pub cache repair || true

# ─── React Native Dependencies ────────────────────────────────────────────────
RUN npm install -g \
    @react-native-community/cli \
    react-native

# ─── App Setup ────────────────────────────────────────────────────────────────
WORKDIR /app

# Copy package files first (for Docker cache optimization)
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm ci --only=production

# Copy server code
COPY server/ ./server/

# Build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Create necessary directories
RUN mkdir -p /app/builds /app/logs

# ─── Environment Variables ────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=5000
ENV ANDROID_HOME=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV FLUTTER_HOME=/opt/flutter
ENV GRADLE_HOME=/opt/gradle/gradle-${GRADLE_VERSION}

# ─── Security: Run as non-root ────────────────────────────────────────────────
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app /app/builds /app/logs

# Give appuser access to Android SDK
RUN chown -R appuser:appuser $ANDROID_HOME || true
RUN chown -R appuser:appuser $FLUTTER_HOME || true

USER appuser

# ─── Expose Port ─────────────────────────────────────────────────────────────
EXPOSE 5000

# ─── Health Check ─────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# ─── Start Application ────────────────────────────────────────────────────────
WORKDIR /app/server
CMD ["node", "index.js"]
