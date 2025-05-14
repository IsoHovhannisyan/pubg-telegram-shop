export default async function handler(req, res) {
    const { oa, o, s } = req.query;
  
    if (s !== process.env.SECOND_SECRET) {
      return res.status(403).send('Invalid signature');
    }
  
    console.log(`✅ Payment received: Order ID = ${o}, Amount = ${oa}`);
  
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send('<html><body>OK</body></html>');
  }
  
  
  
  