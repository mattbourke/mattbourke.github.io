

function getFormattedPrice(symbol, price, currency) {
  const formattedPrice = symbol + (Math.round(price * 100) / 100).toFixed(2) + ' ' + currency;
  return formattedPrice;
}

// initial get when page loads, bit faster than waiting for the price ticker.
$.get( "https://chain.so/api/v2/get_info/BTC", function( response ) {
  const price = getFormattedPrice('$', response.data.price, 'USD');
  const blockNumber = response.data.blocks;

  const blocksTillNextHalving = 630000 - response.data.blocks;
  const daysTillNextHalving = (blocksTillNextHalving / 144).toFixed(0); 


  $('#price').html(price);
  $('#blocks').html(blockNumber);
  $('#daysTillNextHalving').html(daysTillNextHalving);
});

// I decided 10,000 unconfirmed transactions isn't that big a deal, so green, orange is 10k as a warning and >= 20k is red
function getMempoolColor(mempoolCount) {
  let mempoolColor = 'text-color-green';

  if (mempoolCount > 10000) {
    mempoolColor = (mempoolCount < 20000) ? 'text-color-orange' : 'text-color-red';
  }
  return mempoolColor;
}

//Store 20 most recent prices
let recentPricesArray = [];

function updateRecentPricesArray(price) {
  const formattedPrice = parseFloat((Math.round(price * 100) / 100).toFixed(2));
  if (recentPricesArray.length === 10) {
    recentPricesArray.pop();
  }

  recentPricesArray.unshift(formattedPrice);
}

/*
  I've decided to compare the average of the 3 most recent prices to the previous 7 most recent prices.
  why? I don't want the colour frequently changes.
*/

function getPriceDirection() {
  let direction = 'up';

  if (recentPricesArray.length >= 10) {
    let sumOfThreeNewestPrices = recentPricesArray.slice(0, 3).reduce(
      (previous, current) => {
        return current += previous
      }
    );
    
    const averageOfThreeNewestPrices = sumOfThreeNewestPrices / 3;
    let sumOfSevenOldestPrices = recentPricesArray.slice(3, 10).reduce((previous, current) => current += previous);
    const averageOfSevenOldestPrices = sumOfSevenOldestPrices / 7;
    direction = (averageOfThreeNewestPrices > averageOfSevenOldestPrices) ? 'up' : 'down';
  }

  return direction;
}

// connect to SoChain using pusher, this way we get real time data.
Pusher.host = 'slanger1.chain.so'; // our server
Pusher.ws_port = 443; // our server's port
Pusher.wss_port = 443; // ...

// create the pusher client connection
var pusher = new Pusher('e9f5cc20074501ca7395', { encrypted: true, disabledTransports: ['sockjs'], disableStats: true });

// subscribe to the channel for BTC updates (new blocks only)
var ticker = pusher.subscribe('blockchain_update_btc');

ticker.bind('tx_update', function(data) {
  const mempoolCount = data.value.unconfirmed_txs;

  $('#mempool').html(mempoolCount);
  $('#mempool').removeClass("text-color-red text-color-green text-color-orange").addClass(getMempoolColor(mempoolCount));
  $('#mostRecentTXN').html(data.value.sent_value);

  if (data.type == "block") {
    $('#blocks').html(data.value.block_no);
  }

});

var priceTicker = pusher.subscribe('ticker_btc_usd');

priceTicker.bind('price_update', function(data) {
  // show USD price updates
  if (data.type == "price") {
    $(`#${data.value.exchange}`).html(getFormattedPrice('$', data.value.price, 'USD'))
    if (data.value.exchange === "coinbase") {
      $('#price').html(getFormattedPrice('$', data.value.price, 'USD'));
      updateRecentPricesArray(data.value.price);
      
      //Do we have enough data to work out a moving average
      if (recentPricesArray.length === 10) {
        let directionClass = 'direction-' + getPriceDirection();
        $('#price').removeClass("direction-up direction-down").addClass(directionClass);
      }  
    
    }
  }
});

// let's reload the page every hour incase something gets lazy.
setTimeout(function(){
  window.location.reload(1);
}, 3600000);
