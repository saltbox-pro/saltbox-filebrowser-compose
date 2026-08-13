/*
 * hiddenFromUi only hides staging sources in the File Manager sidebar.
 * This allowlist is the real API boundary.
 *
 * Minion Recv: GET/HEAD /api/raw or DELETE /api/resources on
 *   …/files/client-fm-downloads/<id>[/<name>]
 * Client FM Uploads: POST/DELETE /api/resources on /<id>[/<name>]
 *   Extra Filebrowser flags (isDir, override) are allowed on POST.
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
var PATH_KEYS = ["path", "from", "destination", "to"];

function isAbsent(value) {
  return value == null || value === false || value === "";
}

function list(value) {
  if (Array.isArray(value)) {
    var out = [];
    var i;
    for (i = 0; i < value.length; i += 1) {
      if (!isAbsent(value[i])) {
        out.push(String(value[i]));
      }
    }
    return out;
  }
  return isAbsent(value) ? [] : [String(value)];
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
  var decoded;
  for (i = 0; i < files.length; i += 1) {
    decoded = decode(files[i]);
    if (decoded.indexOf(prefix) === 0) {
      out.push(decoded.slice(prefix.length));
    }
  }
  return out;
}

function onlySource(sources, name) {
  return sources.length === 1 && decode(sources[0]) === name;
}

function methodOf(r) {
  return String(r.method || "").toUpperCase();
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
    if (ref != null && decode(ref.source) === SALT_CUSTOM && isCustomUploadPath(ref.path)) {
      customUpload = true;
    }
  });

  if (!customUpload) {
    var saltCustom = false;
    var named = sources.concat(list(r.args.sources));
    var i;
    var j;
    var key;
    var rawPaths;
    for (i = 0; i < named.length; i += 1) {
      if (decode(named[i]) === SALT_CUSTOM) {
        saltCustom = true;
        break;
      }
    }
    if (saltCustom) {
      for (i = 0; i < PATH_KEYS.length; i += 1) {
        key = PATH_KEYS[i];
        rawPaths = list(r.args[key]);
        for (j = 0; j < rawPaths.length; j += 1) {
          if (splitRef(rawPaths[j]) == null && isCustomUploadPath(rawPaths[j])) {
            customUpload = true;
          }
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
  var method = methodOf(r);
  if (recvFiles.length > 0) {
    return yes(
      r.uri.indexOf("/api/raw") === 0 &&
        (method === "GET" || method === "HEAD") &&
        files.length === 1 &&
        recvFiles.length === 1 &&
        sources.length === 0 &&
        paths.length === 0 &&
        isRecvFilePath(recvFiles[0])
    );
  }
  return yes(
    r.uri.indexOf("/api/resources") === 0 &&
      method === "DELETE" &&
      onlySource(sources, RECV) &&
      paths.length === 1 &&
      isRecvDirOrFilePath(decode(paths[0]))
  );
}

function allowUpload(r, files, sources, paths) {
  var method = methodOf(r);
  if (prefixedPaths(files, UPLOAD).length > 0) {
    return "0";
  }
  return yes(
    r.uri.indexOf("/api/resources") === 0 &&
      (method === "POST" || method === "DELETE") &&
      onlySource(sources, UPLOAD) &&
      paths.length === 1 &&
      isUploadPath(decode(paths[0]))
  );
}

function allow(r) {
  if (methodOf(r) === "OPTIONS") {
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
