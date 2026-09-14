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
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("10.0.0.1")), "10/8 must be private");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("172.16.0.1")), "172.16/12 lower bound");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("172.31.255.254")), "172.16/12 upper bound");
        ok(RsLocalNetworkPolicy.isPrivateV4(ip("192.168.49.1")), "192.168/16 must be private");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("172.15.255.254")), "172.15 must not be accepted");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("172.32.0.1")), "172.32 must not be accepted");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("100.64.0.1")), "CGNAT currently rejected by product policy");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("169.254.10.20")), "IPv4 link-local currently rejected by product policy");
        no(RsLocalNetworkPolicy.isPrivateV4(ip("8.8.8.8")), "public address must be rejected");

        ok(RsLocalNetworkPolicy.sameSubnet(ip("192.168.1.4"), ip("192.168.1.200"), 24), "/24 same subnet");
        no(RsLocalNetworkPolicy.sameSubnet(ip("192.168.2.4"), ip("192.168.1.200"), 24), "/24 different subnet");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("192.168.31.254"), ip("192.168.16.1"), 20), "/20 upper member");
        no(RsLocalNetworkPolicy.sameSubnet(ip("192.168.32.1"), ip("192.168.16.1"), 20), "/20 outside");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.0.1.254"), ip("10.0.0.1"), 23), "/23 adjacent class-C span");
        no(RsLocalNetworkPolicy.sameSubnet(ip("10.0.2.1"), ip("10.0.0.1"), 23), "/23 outside");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.20.200.2"), ip("10.20.1.1"), 16), "/16 wide LAN");
        ok(RsLocalNetworkPolicy.sameSubnet(ip("10.1.2.3"), ip("10.1.2.3"), 32), "/32 exact host");
        no(RsLocalNetworkPolicy.sameSubnet(ip("10.1.2.4"), ip("10.1.2.3"), 32), "/32 different host");

        System.out.println("NETWORK_POLICY_CONTRACT_CHECKS=" + checks);
        System.out.println("NETWORK_POLICY_CONTRACT=PASS");
        System.out.println("PRODUCT_ACCEPTS_CGNAT_100_64=false");
        System.out.println("PRODUCT_ACCEPTS_IPV4_LINK_LOCAL_169_254=false");
    }
}
