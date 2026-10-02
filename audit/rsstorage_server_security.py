"""Exercise authorization against the APK's actual server; print only outcomes."""
import http.cookiejar
import os
import re
import urllib.error
import urllib.parse
import urllib.request

base = 'http://127.0.0.1:18080'

def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def request(opener, route, data=None):
    body = None if data is None else urllib.parse.urlencode(data).encode()
    try:
        with opener.open(base + route, body, timeout=15) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

def check(ok, label):
    if not ok:
        raise AssertionError(label)
    print('SERVER_SECURITY_' + label + '=PASS')

anonymous = client()
for route in ('/admin/files', '/api/admin/transfers', '/api/ai/providers'):
    check(request(anonymous, route)[0] == 401, 'UNAUTH_' + route.rsplit('/', 1)[-1].upper())

admin = client()
check(request(admin, '/login', {'u': 'admin', 'p': os.environ['AUDIT_PASS']})[0] == 200, 'ADMIN_LOGIN')
status, page = request(admin, '/admin/files')
check(status == 200, 'ADMIN_FILES')
match = re.search(rb"data-rs-csrf='([^']+)'", page)
check(match is not None, 'ADMIN_CSRF_BOOTSTRAP')
csrf = match.group(1).decode('ascii')
check(request(admin, '/admin/upload?d=%2Fstorage%2Femulated%2F0%2FDownload&name=denied.bin&csrf=wrong', {})[0] == 403, 'UPLOAD_WRONG_CSRF')
check(request(admin, '/admin/action', {'action': 'mkdir', 'path': '/storage/emulated/0/Download', 'name': 'must-not-exist'})[0] == 403, 'ACTION_MISSING_CSRF')
check(request(admin, '/admin/files?d=%2Fetc')[0] == 403, 'OUTSIDE_STORAGE')

account = {'slot': '0', 'username': 'audit-client', 'password': os.environ['AUDIT_PASS'] + '-client', 'enabled': '1', 'csrf': csrf}
check(request(admin, '/admin/client/save', account)[0] == 200, 'CLIENT_CREATE')
try:
    user = client()
    check(request(user, '/login', {'u': account['username'], 'p': account['password']})[0] == 200, 'CLIENT_LOGIN')
    for route in ('/admin/files', '/api/admin/transfers'):
        check(request(user, route)[0] == 403, 'CLIENT_DENIED_' + route.rsplit('/', 1)[-1].upper())
    # Provider discovery is intentionally available to Cinema/AI clients.
    # Provider mutation is administrative and must reject a client.
    check(request(user, '/api/ai/providers', {})[0] == 403, 'CLIENT_DENIED_PROVIDER_MUTATION')
    check(request(user, '/cinema')[0] == 200, 'CLIENT_CINEMA_ALLOWED')
finally:
    check(request(admin, '/admin/client/delete', {'slot': '0', 'csrf': csrf})[0] == 200, 'CLIENT_CLEANUP')
