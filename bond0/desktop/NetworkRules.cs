using System;
using System.Net;
using System.Net.NetworkInformation;

namespace Bond0Control
{
    /// <summary>Pure eligibility checks. Never modifies physical network adapters.</summary>
    public static class NetworkRules
    {
        public static bool EligibleWan(string alias, string description,
            NetworkInterfaceType kind, string ipv4)
        {
            if (string.IsNullOrWhiteSpace(alias) || string.IsNullOrWhiteSpace(ipv4))
                return false;

            // RNDIS/tethering is typically Ethernet, cellular can be PPP/WWAN.
            if (kind != NetworkInterfaceType.Ethernet &&
                kind != NetworkInterfaceType.Wireless80211 &&
                kind != NetworkInterfaceType.Ppp &&
                kind != NetworkInterfaceType.Wwanpp &&
                kind != NetworkInterfaceType.Wwanpp2)
                return false;

            string combined = (alias + " " + (description ?? "")).ToLowerInvariant();
            foreach (string bad in new [] {
                "wintun", "bond0", "wi-fi direct", "wifi direct",
                "virtualbox", "vmware", "hyper-v", "loopback", "tap-windows",
                "vEthernet".ToLowerInvariant(), "ics virtual"
            })
                if (combined.Contains(bad)) return false;

            if (!IPAddress.TryParse(ipv4, out var address) ||
                address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
                return false;

            var bytes = address.GetAddressBytes();
            if (bytes[0] == 0 || bytes[0] == 127 || bytes[0] >= 224) return false;
            if (bytes[0] == 169 && bytes[1] == 254) return false;
            if (bytes[0] == 192 && bytes[1] == 168 && bytes[2] == 137 && bytes[3] == 1)
                return false;  // Windows ICS virtual gateway, not an Internet uplink.
            return true;
        }
    }
}
