#!/bin/bash

set -e

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${CYAN}$1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ Error: $1${NC}"; }
log_warning() { echo -e "${YELLOW}$1${NC}"; }
log_step() { echo -e "${PURPLE}$1${NC}"; }
log_build() { echo -e "${BLUE}$1${NC}"; }

# Main function to run the build script
main() {
    parse_args "$@"
    set_defaults
    check_git_version_and_commit
    update_package_version
    if [[ "$LITE_FLAG" == "true" ]]; then
        archive_name="openlist-frontend-dist-lite-${version_tag}"
    else
        archive_name="openlist-frontend-dist-${version_tag}"
    fi
    build_project
    create_version_file
    handle_compression
    log_success "Build completed."
}

# Parse command-line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev) BUILD_TYPE="dev"; shift ;;
            --release) BUILD_TYPE="release"; shift ;;
            --compress) COMPRESS_FLAG="true"; shift ;;
            --no-compress) COMPRESS_FLAG="false"; shift ;;
            --enforce-tag) ENFORCE_TAG="true"; shift ;;
            --skip-i18n) SKIP_I18N="true"; shift ;;
            --lite) LITE_FLAG="true"; shift ;;
            -h|--help) display_help; exit 0 ;;
            *) log_error "Unknown option: $1"; display_help; exit 1 ;;
        esac
    done
}

# Display help message
display_help() {
    echo "Usage: $0 [--dev|--release] [--compress|--no-compress] [--enforce-tag] [--skip-i18n] [--lite]"
    echo ""
    echo "Options (will overwrite environment setting):"
    echo "  --dev         Build development version"
    echo "  --release     Build release version (will check if git tag match package.json version)"
    echo "  --compress    Create compressed archive"
    echo "  --no-compress Skip compression"
    echo "  --enforce-tag Force git tag requirement for both dev and release builds"
    echo "  --skip-i18n   Skip i18n build step"
    echo "  --lite        Build lite version"
    echo ""
    echo "Environment variables:"
    echo "  OPENLIST_FRONTEND_BUILD_MODE=dev|release (default: dev)"
    echo "  OPENLIST_FRONTEND_BUILD_COMPRESS=true|false (default: false)"
    echo "  OPENLIST_FRONTEND_BUILD_ENFORCE_TAG=true|false (default: false)"
    echo "  OPENLIST_FRONTEND_BUILD_SKIP_I18N=true|false (default: false)"
}

# Set default values from environment variables
set_defaults() {
    BUILD_TYPE=${BUILD_TYPE:-${OPENLIST_FRONTEND_BUILD_MODE:-dev}}
    COMPRESS_FLAG=${COMPRESS_FLAG:-${OPENLIST_FRONTEND_BUILD_COMPRESS:-false}}
    ENFORCE_TAG=${ENFORCE_TAG:-${OPENLIST_FRONTEND_BUILD_ENFORCE_TAG:-false}}
    SKIP_I18N=${SKIP_I18N:-${OPENLIST_FRONTEND_BUILD_SKIP_I18N:-false}}
    LITE_FLAG=${LITE_FLAG:-false}
}

# Check git version and commit
check_git_version_and_commit() {
    if [[ "$BUILD_TYPE" == "release" || "$ENFORCE_TAG" == "true" ]]; then
        enforce_git_tag
    else
        fallback_git_tag
    fi
    commit=$(git rev-parse --short HEAD)
}

# Enforce git tag for release builds
enforce_git_tag() {
    if ! git_version=$(git describe --abbrev=0 --tags 2>/dev/null); then
        log_error "No git tags found. Release build requires a git tag."
        log_warning "Please create a tag first, or use --dev for development builds."
        exit 1
    fi
    validate_git_tag
}

# Validate git tag against package.json version
validate_git_tag() {
    package_version=$(grep '"version":' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
    git_version_clean=${git_version#v}
    if [[ "$git_version_clean" != "$package_version" ]]; then
        log_error "Package.json version (${package_version}) does not match git tag (${git_version_clean})."
        exit 1
    fi
}

# Fallback to default git tag for development builds
fallback_git_tag() {
    git tag -d rolling >/dev/null 2>&1 || true
    git_version=$(git describe --abbrev=0 --tags 2>/dev/null || echo "v0.0.0")
    git_version_clean=${git_version#v}
    git_version_clean=${git_version_clean%%-*}
}

# Update package.json version
update_package_version() {
    if [[ "$BUILD_TYPE" == "dev" ]]; then
        # Handle both BSD and GNU sed syntax
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i "" "s/\"version\": *\"[^\"]*\"/\"version\": \"${git_version_clean}\"/" package.json
        else
            sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"${git_version_clean}\"/" package.json
        fi
        log_success "Package.json version updated to ${git_version_clean}"
        version_tag="v${git_version_clean}-${commit}"
        log_build "Building DEV version ${version_tag}..."
    elif [[ "$BUILD_TYPE" == "release" ]]; then
        version_tag="v${git_version_clean}"
        log_build "Building RELEASE version ${version_tag}..."
    else
        log_error "Invalid build type: $BUILD_TYPE. Use --dev or --release."
        exit 1
    fi
}

# Build the project
build_project() {
    log_step "==== Installing dependencies ===="
    pnpm install

    log_step "==== Building i18n ===="
    if [[ "$SKIP_I18N" == "false" ]]; then
        pnpm i18n:release
    else
        fetch_i18n_from_release
    fi

    log_step "==== Building project ===="
    if [[ "$LITE_FLAG" == "true" ]]; then
        pnpm build:lite
    else
        pnpm build
    fi
}

# Fetch i18n files from release if skip-i18n flag is set
fetch_i18n_from_release() {
    log_warning "Skipping i18n build step, try to fetch from GitHub release"
    release_response=$(curl -s "https://api.github.com/repos/OpenListTeam/OpenList-Frontend/releases/tags/$git_version")
    if echo -n "$release_response" | grep -q "Not Found"; then
        log_warning "Failed to fetch release info. Skipping i18n fetch."
    else
        extract_i18n_tarball "$release_response"
    fi
}

# Extract i18n tarball
extract_i18n_tarball() {
    i18n_file_url=$(echo "$1" | grep -oP '"browser_download_url":\s*"\K[^"]*' | grep "i18n.tar.gz") || true
    if [[ -z "$i18n_file_url" ]]; then
        log_warning "i18n.tar.gz not found in release assets. Skipping i18n fetch."
    else
        log_info "Downloading i18n.tar.gz from GitHub..."
        if curl -L -o "i18n.tar.gz" "$i18n_file_url"; then
            if tar -xzvf i18n.tar.gz -C src/lang; then
                log_info "i18n files extracted to src/lang/"
            else
                log_warning "Failed to extract i18n.tar.gz"
            fi
        else
            log_warning "Failed to download i18n.tar.gz"
        fi
    fi
}

# Create VERSION file in the dist directory
create_version_file() {
    log_step "Writing version $version_tag to dist/VERSION..."
    echo -n "$version_tag" > dist/VERSION
    log_success "Version file created: dist/VERSION"
}

# Handle compression if requested
handle_compression() {
    if [[ "$COMPRESS_FLAG" == "true" ]]; then
        log_step "Creating compressed archive..."
        tar -czvf "${archive_name}.tar.gz" -C dist .
        tar -czvf "i18n.tar.gz" --exclude=en -C src/lang .
        mv "${archive_name}.tar.gz" dist/
        mv "i18n.tar.gz" dist/
        log_success "Compressed archive created: dist/${archive_name}.tar.gz dist/i18n.tar.gz"
    fi
}

# Run the script
main "$@"
