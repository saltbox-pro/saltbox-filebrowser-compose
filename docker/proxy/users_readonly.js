/*
 * Injects the `readOnly` flag into every scope of the FileBrowser
 * `/public/api/users` response and drops sources marked `hiddenFromUi`.
 *
 * Both flags are declared per source in `filebrowser.d/config.yaml.tmpl` and
 * extracted into a JSON map by the FileBrowser entrypoint: FileBrowser itself
 * rejects unknown config keys, so it never sees them. `readOnly` is a UI hint
 * for the frontend, it does not restrict anything on its own. Hidden sources
 * stay available to `/api/raw` and `/api/resources` for internal callers.
 */

import fs from 'fs';

const MAP_PATH = process.env.READONLY_MAP_PATH || '/srv/filebrowser-meta/data/readonly.json';
const UPSTREAM_LOCATION = '/__filebrowser_users';
const PASSTHROUGH_LOCATION = '@filebrowser';
const CACHE_TTL_MS = 10000;

// Headers of the upstream reply that must not outlive the rewritten body
const DROPPED_HEADERS = [
    'content-length',
    'content-encoding',
    'transfer-encoding',
    'etag',
    'last-modified',
];

let cache = { at: 0, map: {} };

function sourceFlags(map, name) {
    const value = map[name];
    if (value && typeof value === 'object') {
        return value;
    }
    return { readOnly: value === true, hidden: false };
}

function readOnlyMap(r) {
    const now = Date.now();
    if (cache.at && now - cache.at < CACHE_TTL_MS) {
        return cache.map;
    }

    let map = {};
    try {
        map = JSON.parse(fs.readFileSync(MAP_PATH)) || {};
    } catch (e) {
        r.warn(`read-only map is unavailable at ${MAP_PATH}: ${e}`);
    }
    cache = { at: now, map: map };
    return map;
}

function patchUser(user, map) {
    if (user && Array.isArray(user.scopes)) {
        user.scopes = user.scopes.filter(function (scope) {
            return sourceFlags(map, scope.name).hidden !== true;
        });
        user.scopes.forEach(function (scope) {
            scope.readOnly = sourceFlags(map, scope.name).readOnly === true;
        });
    }
    return user;
}

async function handler(r) {
    if (r.method !== 'GET') {
        r.internalRedirect(PASSTHROUGH_LOCATION);
        return;
    }

    const reply = await r.subrequest(UPSTREAM_LOCATION, { args: r.variables.args || '' });

    for (const name in reply.headersOut) {
        if (DROPPED_HEADERS.indexOf(name.toLowerCase()) === -1) {
            r.headersOut[name] = reply.headersOut[name];
        }
    }

    if (reply.status !== 200) {
        r.return(reply.status, reply.responseText);
        return;
    }

    let data;
    try {
        data = JSON.parse(reply.responseText);
    } catch (e) {
        r.warn(`unexpected non-JSON response of ${UPSTREAM_LOCATION}: ${e}`);
        r.return(reply.status, reply.responseText);
        return;
    }

    const map = readOnlyMap(r);
    // `?id=` is answered with a single user, no `id` at all - with a list of them
    const patched = Array.isArray(data)
        ? data.map(function (user) { return patchUser(user, map); })
        : patchUser(data, map);

    r.headersOut['Content-Type'] = 'application/json';
    r.return(200, JSON.stringify(patched));
}

export default { handler };
