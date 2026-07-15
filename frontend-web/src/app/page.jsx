import RoleSelector from "./selector/RoleSelector";

export const metadata = {
  title: "EMAHU | Welcome",
  description: "Select your experience on EMAHU - Retail Buyer, Merchant Seller, or Logistics Partner.",
};

export default function Home() {
  return <RoleSelector />;
}

