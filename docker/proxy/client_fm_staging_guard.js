/*
 * hiddenFromUi only hides staging sources in the File Manager sidebar.
 * This allowlist is the real API boundary.
 *
 * Minion Recv: GET/HEAD /api/raw or DELETE /api/resources on
 *   …/files/client-fm-downloads/<id>[/<name>]
 * Client FM Uploads: POST/DELETE /api/resources on /<id>[/<name>]
 * Salt Custom must not reach /client-fm-uploads (including PATCH from/destination).
 * Names/prefixes stay in sync with toolkit DOWNLOAD_STAGING_* / UPLOAD_STAGING_*.
 */

var RECV = "Minion Recv";
var UPLOAD = "Client FM Uploads";
var SALT_CUSTOM = "Salt Custom";
var CUSTOM_UPLOAD_ROOT = "/client-fm-uploads";
var RECV_DIR = /^\/[^/]+\/files\/client-fm-downloads\/[^/]+$/;
var RECV_FILE = /^\/[^/]+\/files\/client-fm-downloads\/[^/]+\/[^/]+$/;
var UPLOAD_PATH = /^\/[^/]+(?:\/[^/]+)?$/;
var QUERY_KEYS = ["files", "source", "sources", "path", "from", "destination", "to"];

function list(value) {
  if (Array.isArray(value)) {
    var out = [];
    var i;
    for (i = 0; i < value.length; i += 1) {
      out.push(String(value[i]));
    }
    return out;
  }
  return value == null ? [] : [String(value)];
}

function decode(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, " "));
  } catch (e) {
    return String(value);
  }
}

function fullyDecode(value) {
  var current = String(value);
  var i;
  for (i = 0; i < 5; i += 1) {
    try {
      var next = decodeURIComponent(current.replace(/\+/g, " "));
      if (next === current) {
        return current;
      }
      current = next;
    } catch (e) {
      return current;
    }
  }
  return null;
}

function canonicalPath(path) {
  var decoded = fullyDecode(path);
  if (decoded == null || decoded.indexOf("\\") !== -1) {
    return null;
  }
  if (!decoded) {
    return "";
  }
  if (decoded.charAt(0) !== "/") {
    decoded = "/" + decoded;
  }
  var parts = decoded.split("/");
  var out = [];
  var i;
  var part;
  for (i = 0; i < parts.length; i += 1) {
    part = parts[i];
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      if (out.length === 0) {
        return null;
      }
      out.pop();
      continue;
    }
    out.push(part);
  }
  return "/" + out.join("/");
}

function isRecvFilePath(path) {
  var canonical = canonicalPath(path);
  return canonical != null && RECV_FILE.test(canonical);
}

function isRecvDirOrFilePath(path) {
  var canonical = canonicalPath(path);
  return canonical != null && (RECV_FILE.test(canonical) || RECV_DIR.test(canonical));
}

function isUploadPath(path) {
  var canonical = canonicalPath(path);
  return canonical != null && UPLOAD_PATH.test(canonical);
}

function isCustomUploadPath(path) {
  var canonical = canonicalPath(path);
  if (canonical == null) {
    return true;
  }
  return (
    canonical === CUSTOM_UPLOAD_ROOT || canonical.indexOf(CUSTOM_UPLOAD_ROOT + "/") === 0
  );
}

function splitRef(value) {
  var decoded = decode(value);
  var sep = decoded.indexOf("::");
  if (sep === -1) {
    return null;
  }
  return { source: decoded.slice(0, sep), path: decoded.slice(sep + 2) };
}

function mentionsSource(part, source) {
  return part === source || part.indexOf(source + "::") === 0;
}

function mentions(value, source) {
  var decoded = decode(value);
  if (mentionsSource(decoded, source)) {
    return true;
  }
  var parts = decoded.split(",");
  var i;
  var part;
  for (i = 0; i < parts.length; i += 1) {
    part = parts[i].trim();
    if (mentionsSource(part, source)) {
      return true;
    }
  }
  return false;
}

function eachArg(r, fn) {
  var args = r.args;
  if (!args) {
    return;
  }
  var seen = {};
  var i;
  var j;
  var key;
  for (i = 0; i < QUERY_KEYS.length; i += 1) {
    key = QUERY_KEYS[i];
    seen[key] = true;
    var known = list(args[key]);
    for (j = 0; j < known.length; j += 1) {
      fn(known[j]);
    }
  }
  for (key in args) {
    if (seen[key]) {
      continue;
    }
    var extra = list(args[key]);
    for (j = 0; j < extra.length; j += 1) {
      fn(extra[j]);
    }
  }
}

function prefixedPaths(files, source) {
  var prefix = source + "::";
  var out = [];
  var i;
  for (i = 0; i < files.length; i += 1) {
    if (files[i].indexOf(prefix) === 0) {
      out.push(decode(files[i].slice(prefix.length)));
    }
  }
  return out;
}

function onlySource(sources, name) {
  return sources.length === 1 && decode(sources[0]) === name;
}

function yes(ok) {
  return ok ? "1" : "0";
}

function inspect(r) {
  var files = list(r.args.files);
  var sources = list(r.args.source);
  var paths = list(r.args.path);
  var recv = false;
  var upload = false;
  var customUpload = false;

  eachArg(r, function (value) {
    if (mentions(value, RECV)) {
      recv = true;
    }
    if (mentions(value, UPLOAD)) {
      upload = true;
    }
    var ref = splitRef(value);
    if (isCustomUploadPath(value) || (ref != null && isCustomUploadPath(ref.path))) {
      customUpload = true;
    }
  });

  if (!customUpload) {
    var i;
    var j;
    for (i = 0; i < sources.length; i += 1) {
      if (decode(sources[i]) !== SALT_CUSTOM) {
        continue;
      }
      for (j = 0; j < paths.length; j += 1) {
        if (isCustomUploadPath(paths[j])) {
          customUpload = true;
        }
      }
    }
  }

  return {
    files: files,
    sources: sources,
    paths: paths,
    recv: recv,
    upload: upload,
    customUpload: customUpload,
  };
}

function allowRecv(r, files, sources, paths) {
  var recvFiles = prefixedPaths(files, RECV);
  if (recvFiles.length > 0) {
    return yes(
      r.uri.indexOf("/api/raw") === 0 &&
        (r.method === "GET" || r.method === "HEAD") &&
        files.length === 1 &&
        recvFiles.length === 1 &&
        sources.length === 0 &&
        paths.length === 0 &&
        isRecvFilePath(recvFiles[0])
    );
  }
  return yes(
    r.uri.indexOf("/api/resources") === 0 &&
      r.method === "DELETE" &&
      onlySource(sources, RECV) &&
      paths.length === 1 &&
      isRecvDirOrFilePath(decode(paths[0]))
  );
}

function allowUpload(r, files, sources, paths) {
  if (prefixedPaths(files, UPLOAD).length > 0) {
    return "0";
  }
  return yes(
    r.uri.indexOf("/api/resources") === 0 &&
      (r.method === "POST" || r.method === "DELETE") &&
      onlySource(sources, UPLOAD) &&
      paths.length === 1 &&
      isUploadPath(decode(paths[0]))
  );
}

function allow(r) {
  if (r.method === "OPTIONS") {
    return "1";
  }

  var hit = inspect(r);
  if (hit.customUpload || (hit.recv && hit.upload)) {
    return "0";
  }
  if (hit.recv) {
    return allowRecv(r, hit.files, hit.sources, hit.paths);
  }
  if (hit.upload) {
    return allowUpload(r, hit.files, hit.sources, hit.paths);
  }
  return "1";
}

export default { allow };
