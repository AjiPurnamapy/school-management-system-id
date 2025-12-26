from slowapi import Limiter
from slowapi.util import get_remote_address

# inisialisasi limiter
# get_remote_Address artinya kita membatasi IP Address user
limiter = Limiter(key_func=get_remote_address)