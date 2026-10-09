#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# LinkkWork Mobile Quality Gate & Validation Script
# Performs:
#   1. Format Check (dart format)
#   2. Strict Static Analysis & Type Check (flutter analyze)
#   3. Zero Code Leakage Boundary Check
#   4. Unit & Widget Tests (melos run test)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export PATH="$HOME/development/flutter/bin:$HOME/.pub-cache/bin:$PATH"

echo "=========================================================="
echo "🔍 Starting LinkkWork Mobile App Suite Quality Gate"
echo "=========================================================="

cd "${MOBILE_ROOT}"

echo "Step 1/4: Checking Dart code formatting..."
melos run format:check --no-select
echo "✅ Code formatting check passed."

echo "Step 2/4: Running strict static analysis & typecheck..."
melos run analyze --no-select
echo "✅ Static analysis & strict typing passed with 0 issues."

echo "Step 3/4: Verifying Zero Code Leakage between domains..."
# Ensure customer_app does NOT import tasker_domain
if grep -rn "linkkwork_tasker_domain" "${MOBILE_ROOT}/apps/customer_app" | grep -v "\.dart_tool" | grep -v "pubspec.lock" > /dev/null; then
  echo "❌ VIOLATION: Customer App contains imports from tasker_domain!"
  exit 1
fi

# Ensure tasker_app does NOT import customer_domain
if grep -rn "linkkwork_customer_domain" "${MOBILE_ROOT}/apps/tasker_app" | grep -v "\.dart_tool" | grep -v "pubspec.lock" > /dev/null; then
  echo "❌ VIOLATION: Tasker App contains imports from customer_domain!"
  exit 1
fi
echo "✅ Zero Code Leakage isolation verified (Customer & Tasker boundaries clean)."

echo "Step 4/4: Running full unit & widget test suite..."
melos run test --no-select
echo "✅ All mobile test suites passed cleanly."

echo "=========================================================="
echo "🎉 Quality Gate PASSED: Mobile code is 100% production-ready!"
echo "=========================================================="
