#!/usr/bin/env sh
set -x
set -o nounset errexit
index_file_in=/usr/share/nginx/html/index.tpl.html
index_file_out=/usr/share/nginx/html/index.html
tmp_trackcodefile=/tmp/trackcode

# To inject tracking code, you have two choices:
# 1) Template using the provided google analytics
# 2) Insert with your own provided code, by overriding the ANALYTICS_CODE_PATH
# The ANALYTICS_CODE_PATH is the location of a file inside the container
ANALYTICS_CODE_PATH="${ANALYTICS_CODE_PATH:-dist/ga.html.tmpl}"

if [ "${INSERT_ANALYTICS:-NO}" = "NO" ]; then
    echo "" > "${tmp_trackcodefile}"
fi

# Automatically insert analytics if GA_TRACKING_ID is set
if [ "${GA_TRACKING_ID:-}" != "" ] || [ "${INSERT_ANALYTICS:-NO}" != "NO" ]; then
    echo "Templating code from ${ANALYTICS_CODE_PATH}"
    sed "s#<!-- TRACKING NUMBER -->#${GA_TRACKING_ID:-}#g" "${ANALYTICS_CODE_PATH}" > "$tmp_trackcodefile"
fi

echo "Templating ${index_file_in}"
sed "/<!-- TRACK CODE -->/r ${tmp_trackcodefile}" "${index_file_in}" > "${index_file_out}"
rm "${tmp_trackcodefile}"

# Let's copy env-config.js using a hash
set -- $(md5sum /usr/share/nginx/html/env-config.js)
md5="${1}"
cp /usr/share/nginx/html/env-config.js /usr/share/nginx/html/env-config.${md5}.js
sed -i "s/env-config.js/env-config.${md5}.js/g" "${index_file_out}"
