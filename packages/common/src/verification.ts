import { ethers } from "ethers";
import { objectToDeterministicJSON } from "./deterministicJSON";

export const verifyMessageSignature = (
  validSigners: string[],
  signature: string,
  message: string,
): boolean => {
  const messageHash = ethers.hashMessage(message);
  const messageDigest = ethers.getBytes(messageHash);
  const sig = ethers.Signature.from(signature);

  for (const address of validSigners) {
    const recoveredAddress = ethers.recoverAddress(messageDigest, sig);
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      return true;
    }
  }

  return false;
};

export const verifyApplicationMetadata = (
  projectId: string,
  owner: string[],
  applicationMetadata: any,
): boolean => {
  const signature = applicationMetadata.signature;
  const application = applicationMetadata.application;
  const deterministicApplication = objectToDeterministicJSON(
    application as any,
  );
  const hash = ethers.solidityPackedKeccak256(
    ["string"],
    [deterministicApplication],
  );

  const idSegments = application.project.id.split(":");

  return (
    verifyMessageSignature(owner, signature, hash)  &&
    ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256"],
      [idSegments[0], idSegments[1], idSegments[2]]
    ).toLowerCase() === projectId.toLowerCase()
  );
};