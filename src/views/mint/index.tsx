import React, { useCallback } from "react";
import { useConnection } from "../../contexts/connection";
import { Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "../../components/ConnectButton";
import { LABELS } from "../../constants";
import { useWallet } from "@solana/wallet-adapter-react";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"

export const MintView = () => {
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  const handleRequestMint = useCallback(async () => {
    try {
      if (!publicKey) {
        return;
      }
      // Generate a new wallet keypair and airdrop SOL
      let fromWallet = Keypair.generate();
      let fromAirdropSignature = await connection.requestAirdrop(
          fromWallet.publicKey,
          LAMPORTS_PER_SOL,
      );
      //wait for airdrop confirmation
      await connection.confirmTransaction(fromAirdropSignature);

      //create new token mint
      let mint = await Token.createMint(
          connection,
          fromWallet,
          fromWallet.publicKey,
          null,
          9,
          TOKEN_PROGRAM_ID,
      );
      //get the token account of the fromWallet Solana address, if it does not exist, create it
      let fromTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
          fromWallet.publicKey,
      );
      //minting 1 new token to the "fromTokenAccount" account we just returned/created
      await mint.mintTo(
          fromTokenAccount.address, //who it goes to
          fromWallet.publicKey, // minting authority
          [], // multisig
          1000000000, // how many
      );

      await mint.setAuthority(
          mint.publicKey,
          null,
          "MintTokens",
          fromWallet.publicKey,
          []
      )

      let toTokenAccount = await mint.getOrCreateAssociatedAccountInfo(publicKey);

      // Add token transfer instructions to transaction
      let transaction = new Transaction().add(
          Token.createTransferInstruction(
              TOKEN_PROGRAM_ID,
              fromTokenAccount.address,
              toTokenAccount.address,
              fromWallet.publicKey,
              [],
              1000000000,
          ),
      );

      // Sign transaction, broadcast, and confirm
      let signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [fromWallet],
          {commitment: 'confirmed'},
      );
      console.log('SIGNATURE', signature);

    } catch (error) {
      notify({
        message: LABELS.AIRDROP_FAIL,
        type: "error",
      });
      console.error(error);
    }
  }, [publicKey, connection]);

  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <div className="deposit-input-title" style={{ margin: 10 }}>
          {LABELS.MINT_INFO}
        </div>
        <ConnectButton type="primary" onClick={handleRequestMint}>
          {LABELS.GIVE_NFT}
        </ConnectButton>
      </div>
    </div>
  );
};
