"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
  return (
    <ConnectButton
      accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
      chainStatus="icon"
      showBalance={false}
      label="Connect"
    />
  );
}
