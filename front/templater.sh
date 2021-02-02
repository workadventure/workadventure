#!/usr/bin/env bash
set -x
set -o nounset errexit
template_file_index=dist/index.tmpl.html
generated_file_index=dist/index.html
tmp_trackcodefile=/tmp/trackcode

# To inject tracking code, you have two choices:
# 1) Template using the provided google analytics
# 2) Insert with your own provided code, by overriding the ANALYTICS_CODE_PATH
# The ANALYTICS_CODE_PATH is the location of a file inside the container
ANALYTICS_CODE_PATH="${ANALYTICS_CODE_PATH:-dist/ga.html.tmpl}"

if [[ "${INSERT_ANALYTICS:-NO}" == "NO" ]]; then
    echo "" > "${tmp_trackcodefile}"
fi

# Automatically insert analytics if GA_TRACKING_ID is set
if [[ "${GA_TRACKING_ID:-}" != ""  || "${INSERT_ANALYTICS:-NO}" != "NO" ]]; then
    echo "Templating code from ${ANALYTICS_CODE_PATH}"
    sed "s#<!-- TRACKING NUMBER -->#${GA_TRACKING_ID:-}#g" "${ANALYTICS_CODE_PATH}" > "$tmp_trackcodefile"
fi

echo "Templating ${generated_file_index} from ${template_file_index}"
sed "/<!-- TRACK CODE -->/r ${tmp_trackcodefile}" "${template_file_index}" > "${generated_file_index}"
rm "${tmp_trackcodefile}"
