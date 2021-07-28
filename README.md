# savvi
A firebase functions project to construct an API for a personal finance management app

## Overview
I used the cloud firestore database to create this. The base collection is the "users" collection

Each user contains 3 sub collections, funds, incomes, and expenses. The user has the below basic properties

{
  "name": string,
  "totalBalance": number
}

The totalBalance is the sum of all balances of all of the funds the user has control of. This is automatically updated via database triggers any time a fund, expense, or income is created or updated.

Funds are basically like a bank account, they are created with a starting balance. Then that balance will be altered by each income or expense added. The basic properties of a fund would look like this:

{
  "name": string,
  "balance": number
}

Expenses are transactions that subtract from the balance of a fund, the structure of an expense will be

{
  "fundId": string,
  "amount": number,
  "note": string
}

Incomes are the exact same as expenses, except they add to the fund balance. 
