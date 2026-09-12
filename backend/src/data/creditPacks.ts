export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  amountPaise: number;
  tagline: string;
  popular?: boolean;
};

export const creditPacks: CreditPack[] = [
  { id: "starter", name: "Starter Pack", credits: 50, amountPaise: 49900, tagline: "50 searches for solo marketers" },
  {
    id: "growth",
    name: "Growth Pack",
    credits: 200,
    amountPaise: 149900,
    tagline: "200 searches, best value for agencies",
    popular: true,
  },
  {
    id: "scale",
    name: "Scale Pack",
    credits: 1000,
    amountPaise: 599900,
    tagline: "1,000 searches for teams running outreach daily",
  },
];

export function getPack(id: string): CreditPack | undefined {
  return creditPacks.find((pack) => pack.id === id);
}
