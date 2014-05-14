Localhostify
============

Simple chrome extension which take a table : port -> fqdn and create
for each record a server listening on localhost:[port] and transfer sockets to
[fqdn] through a Socks5 proxy.

Useful to use a socks5 proxy to access a network but do not want to use
`tsocks` or specific library to access a given application through the proxy socks.
