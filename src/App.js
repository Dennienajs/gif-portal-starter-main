import React, { useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const keyPairArray = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(keyPairArray);
const baseAccount = Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programId = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const options = { preflightCommitment: "processed" };

// App Constants
const TWITTER_HANDLE = "najsgg";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  useEffect(() => {
    const onLoad = async () => await CheckIfUserHasSolanaWalletInstalled();
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  });

  useEffect(() => {
    if (walletAddress) {
      getGifList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Account: ", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  const CheckIfUserHasSolanaWalletInstalled = async () => {
    try {
      // Solana object is automatically injected into window if Phantom is installed.
      const { solana } = window;

      if (!solana) {
        alert(
          "Solana wallet not found. Please install the Phantom Solana wallet!"
        );
        return;
      }

      if (solana.isPhantom) {
        // Phantom popup -> connect
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(response);
        const publicKey = response.publicKey.toString();
        console.log("Connected with public key: ", publicKey);

        setWalletAddress(publicKey);
      } else {
        console.log("Wallet found - Not Phantom..");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    // Phantom popup -> connect
    const response = await solana.connect();
    console.log(response);
    const publicKey = response.publicKey.toString();
    console.log("Connected with public key: ", publicKey);

    setWalletAddress(publicKey);
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (e) => {
    const { value } = e.target;
    setInputValue(value);
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    sendGif();
  };

  const getProvider = () => {
    const connection = new Connection(network, options.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      options.preflightCommitment
    );

    return provider;
  };

  const getProgram = (provider) => new Program(idl, programId, provider);

  const sendGif = async () => {
    if (inputValue.length <= 0) {
      console.log("No GIF link ...");
      return;
    }

    console.log("Gif link: ", inputValue);

    try {
      const provider = getProvider();
      const program = getProgram(provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("GIF successfully submitted to program.");

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:");
      console.log(error);
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = getProgram(provider);
      console.log("ping createGifAccount");

      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "Created new BaseAccount with address: ",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:");
      console.log(error);
    }
  };

  const renderCreateGifAccountContainer = () => (
    <div className="connected-container">
      <button
        className="cta-button submit-gif-button"
        onClick={createGifAccount}
      >
        Create One-Click GIF Account!
      </button>
    </div>
  );

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return renderCreateGifAccountContainer();
    } else {
      return (
        <div className="connected-container">
          <form onSubmit={onFormSubmit}>
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifList &&
              gifList.map((item, index) => (
                <div className="gif-item" key={index}>
                  <img src={item.gifLink} alt={"Some GIF uploaded by user"} />
                </div>
              ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 giphyverse</p>
          <p className="sub-text">View your collection in the giphyverse ✨</p>
          {walletAddress
            ? renderConnectedContainer()
            : renderNotConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
