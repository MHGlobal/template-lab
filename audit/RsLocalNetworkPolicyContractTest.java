package com.rs.localstorage;

import java.net.InetAddress;

public final class RsLocalNetworkPolicyContractTest {
    static int checks = 0;

    static InetAddress ip(String value) throws Exception { return InetAddress.getByName(value); }
    static void ok(boolean value, String label) {
        checks++;
        if (!value) throw new AssertionError(label);
    }
    static void no(boolean value, String label) { ok(!value, label); }

    public static void main(String[] args) throws Exception {
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("10.0.0.1")), "10/8 must be local");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("172.16.0.1")), "172.16/12 lower bound");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("172.31.255.254")), "172.16/12 upper bound");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("192.168.49.1")), "192.168/16 must be local");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("100.64.0.1")), "CGNAT 100.64/10 is Android local network");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("100.127.255.254")), "CGNAT 100.64/10 upper bound");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("169.254.10.20")), "IPv4 link-local is Android local network");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("172.15.255.254")), "172.15 must not be accepted");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("172.32.0.1")), "172.32 must not be accepted");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("100.128.0.1")), "outside CGNAT must not be accepted");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("8.8.8.8")), "public IPv4 must be rejected");

        ok(RsLocalNetworkPolicy.sameSubnet(ip("192.168.1.4"), ip("192.168.1.200"), 24), "/24 same subnet");
        no(RsLocalNetworkPolicy.sameSubnet(ip("192.168.2.4"), ip("192.168.1.200"), 24), "/24 different subnet");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("192.168.31.254"), ip("192.168.16.1"), 20), "/20 upper member");
        no(RsLocalNetworkPolicy.sameSubnet(ip("192.168.32.1"), ip("192.168.16.1"), 20), "/20 outside");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.0.1.254"), ip("10.0.0.1"), 23), "/23 adjacent class-C span");
        no(RsLocalNetworkPolicy.sameSubnet(ip("10.0.2.1"), ip("10.0.0.1"), 23), "/23 outside");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.20.200.2"), ip("10.20.1.1"), 16), "/16 wide LAN");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.1.2.3"), ip("10.1.2.3"), 32), "/32 exact host");
        no(RsLocalNetworkPolicy.sameSubnet(ip("10.1.2.4"), ip("10.1.2.3"), 32), "/32 different host");

        ok(RsLocalNetworkPolicy.sameSubnet(ip("fe80::abcd"), ip("fe80::1"), 64), "IPv6 link-local /64 same subnet");
        no(RsLocalNetworkPolicy.sameSubnet(ip("fe80:1::abcd"), ip("fe80::1"), 64), "IPv6 link-local /64 different subnet");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("fd12:3456:789a::2"), ip("fd12:3456:789a::1"), 64), "IPv6 ULA /64 same subnet");
        no(RsLocalNetworkPolicy.sameSubnet(ip("fd12:3456:789b::2"), ip("fd12:3456:789a::1"), 64), "IPv6 ULA /64 different subnet");

        ok(RsLocalNetworkPolicy.isLocalInterfaceAddress(ip("fe80::1")), "IPv6 link-local interface accepted");
        ok(RsLocalNetworkPolicy.isLocalInterfaceAddress(ip("fd12:3456:789a::1")), "IPv6 ULA interface accepted");
        no(RsLocalNetworkPolicy.isLocalInterfaceAddress(ip("::1")), "IPv6 loopback rejected");

        System.out.println("NETWORK_POLICY_CONTRACT_CHECKS=" + checks);
        System.out.println("NETWORK_POLICY_CONTRACT=PASS");
        System.out.println("PRODUCT_ACCEPTS_CGNAT_100_64=true");
        System.out.println("PRODUCT_ACCEPTS_IPV4_LINK_LOCAL_169_254=true");
        System.out.println("PRODUCT_SUPPORTS_IPV6_LOCAL_PREFIXES=true");
    }
}
