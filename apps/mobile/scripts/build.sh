#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# LinkkWork Mobile Build Runner Script
# Usage:
#   ./build.sh customer [apk|bundle|ipa] [--debug|--release]
#   ./build.sh tasker [apk|bundle|ipa] [--debug|--release]
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Ensure Flutter & Melos are in PATH
export PATH="$HOME/development/flutter/bin:$HOME/.pub-cache/bin:$PATH"

TARGET_APP="${1:-customer}"
BUILD_TYPE="${2:-apk}"
BUILD_MODE="${3:---debug}"

echo "=========================================================="
echo "🚀 LinkkWork Mobile App Suite - Build System"
echo "   Target: ${TARGET_APP}_app"
echo "   Type:   ${BUILD_TYPE}"
echo "   Mode:   ${BUILD_MODE}"
echo "=========================================================="

case "${TARGET_APP}" in
  customer|customer_app)
    APP_DIR="${MOBILE_ROOT}/apps/customer_app"
    APP_NAME="LinkkWork Khách Hàng"
    ;;
  tasker|tasker_app)
    APP_DIR="${MOBILE_ROOT}/apps/tasker_app"
    APP_NAME="LinkkWork Thợ Đối Tác"
    ;;
  *)
    echo "❌ Unknown app target: ${TARGET_APP}. Allowed: 'customer' or 'tasker'"
    exit 1
    ;;
esac

if [ ! -d "${APP_DIR}" ]; then
  echo "❌ Directory not found: ${APP_DIR}"
  exit 1
fi

cd "${APP_DIR}"

echo "📦 Resolving dependencies for ${APP_NAME}..."
flutter pub get

echo "🔨 Building ${BUILD_TYPE} (${BUILD_MODE})..."
case "${BUILD_TYPE}" in
  apk)
    flutter build apk "${BUILD_MODE}"
    echo "✅ APK generated in: ${APP_DIR}/build/app/outputs/flutter-apk/"
    ;;
  bundle|appbundle)
    flutter build appbundle "${BUILD_MODE}"
    echo "✅ App Bundle generated in: ${APP_DIR}/build/app/outputs/bundle/"
    ;;
  ipa|ios)
    echo "⚠️ Note: iOS builds require macOS and valid Xcode codesigning provisioning."
    flutter build ios --no-codesign "${BUILD_MODE}"
    echo "✅ iOS build generated in: ${APP_DIR}/build/ios/"
    ;;
  *)
    echo "❌ Unknown build type: ${BUILD_TYPE}. Allowed: 'apk', 'bundle', 'ipa'"
    exit 1
    ;;
esac

echo "🎉 Build finished successfully for ${APP_NAME}!"
