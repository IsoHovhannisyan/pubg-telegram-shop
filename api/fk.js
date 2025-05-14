// api/fk.js
export default async function handler(req, res) {
    const { oa, o, s } = req.query;
  
    // Ստուգում ենք գաղտնի սլովոն
    if (s !== 'abc123') {
      return res.status(403).send('Invalid signature');
    }
  
    // Այստեղ կարող ես ավելացնել քո պատվերի ստուգման/փոփոխման լոգիկան
    console.log(`Payment success for Order ID: ${o}, Amount: ${oa}`);
  
    // Պատասխան ուղարկում Freekassa-ին
    res.status(200).send('OK');
  }
  