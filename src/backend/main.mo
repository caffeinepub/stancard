import Text "mo:base/Text";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Time "mo:base/Time";
import IC "ic:aaaaa-aa";
import Char "mo:base/Char";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";

persistent actor {

  // ─── Types ──────────────────────────────────────────────────

  public type StockQuote = {
    symbol : Text;
    name : Text;
    price : Float;
    changesPercentage : Float;
  };

  public type ForexRate = {
    symbol : Text;
    rate : Float;
  };

  public type CryptoQuote = {
    symbol : Text;
    name : Text;
    price : Float;
    changesPercentage : Float;
  };

  public type MarketData = {
    stocks : [StockQuote];
    forex : [ForexRate];
    crypto : [CryptoQuote];
    lastUpdated : Nat;
    success : Bool;
  };

  public type NewsArticle = {
    title : Text;
    source : Text;
    url : Text;
    urlToImage : Text;
    publishedAt : Text;
    description : Text;
  };

  public type NewsData = {
    articles : [NewsArticle];
    lastUpdated : Nat;
    success : Bool;
  };

  public type Alert = {
    id : Text;
    assetType : Text;
    symbol : Text;
    condition : Text;
    targetPrice : Float;
    isActive : Bool;
    isTriggered : Bool;
    createdAt : Nat;
  };

  public type YouTubeVideo = {
    videoId : Text;
    title : Text;
    thumbnail : Text;
    channelTitle : Text;
  };

  public type UserProfile = {
    displayName : Text;
    preferredCurrency : Text;
    language : Text;
    hideBalance : Bool;
    hideTransactions : Bool;
  };

  // ─── Historical Price Cache Types ───────────────────────────────

  public type HistoricalCache = {
    prices : [Float];   // 7 daily close prices, oldest first
    fetchedAt : Int;    // nanosecond timestamp
  };

  // ─── Persistent state ───────────────────────────────────────────

  var alerts : [Alert] = [];
  var alertCounter : Nat = 0;
  var userProfiles : [(Principal, UserProfile)] = [];
  var historicalPriceCache : [(Text, HistoricalCache)] = [];

  // ─── Mock / Fallback Data ──────────────────────────────────────────────

  transient let mockStocks : [StockQuote] = [
    { symbol = "AAPL";  name = "Apple Inc.";           price = 189.30; changesPercentage =  0.82 },
    { symbol = "GOOGL"; name = "Alphabet Inc.";         price = 175.50; changesPercentage =  1.15 },
    { symbol = "TSLA";  name = "Tesla Inc.";            price = 177.60; changesPercentage = -2.34 },
    { symbol = "AMZN";  name = "Amazon.com Inc.";       price = 192.45; changesPercentage =  0.58 },
    { symbol = "MSFT";  name = "Microsoft Corp.";       price = 415.20; changesPercentage =  0.43 },
    { symbol = "META";  name = "Meta Platforms Inc.";   price = 512.80; changesPercentage =  1.72 },
    { symbol = "NVDA";  name = "NVIDIA Corp.";          price = 875.40; changesPercentage =  2.91 },
    { symbol = "NFLX";  name = "Netflix Inc.";          price = 632.70; changesPercentage = -0.67 },
    { symbol = "BABA";  name = "Alibaba Group";         price = 73.20;  changesPercentage = -1.04 },
    { symbol = "TSM";   name = "Taiwan Semiconductor";  price = 145.80; changesPercentage =  0.23 },
  ];

  transient let mockForex : [ForexRate] = [
    { symbol = "USD"; rate = 1.0    },
    { symbol = "NGN"; rate = 1550.0 },
    { symbol = "EUR"; rate = 0.92   },
    { symbol = "GBP"; rate = 0.79   },
    { symbol = "CNY"; rate = 7.24   },
    { symbol = "JPY"; rate = 149.50 },
  ];

  transient let mockCrypto : [CryptoQuote] = [
    { symbol = "BTC"; name = "Bitcoin";  price = 67000.0; changesPercentage =  1.45 },
    { symbol = "ETH"; name = "Ethereum"; price = 3500.0;  changesPercentage =  2.10 },
    { symbol = "BNB"; name = "BNB";      price = 580.0;   changesPercentage = -0.30 },
  ];

  transient let mockNews : [NewsArticle] = [
    {
      title = "Global Markets Rally as Central Banks Signal Rate Cuts";
      source = "Reuters";
      url = "https://reuters.com";
      urlToImage = "";
      publishedAt = "2026-04-06T08:00:00Z";
      description = "Major indices surged worldwide as investors digested signals from central banks about potential interest rate reductions later this year."
    },
    {
      title = "Africa's Tech Sector Sees Record Investment in Q1 2026";
      source = "Bloomberg";
      url = "https://bloomberg.com";
      urlToImage = "";
      publishedAt = "2026-04-06T07:30:00Z";
      description = "Venture capital flows into African fintech and technology startups reached a new quarterly record, driven by mobile payment platforms and infrastructure plays."
    },
    {
      title = "Bitcoin Surpasses $70,000 on ETF Inflow Surge";
      source = "CoinDesk";
      url = "https://coindesk.com";
      urlToImage = "";
      publishedAt = "2026-04-06T07:00:00Z";
      description = "Bitcoin broke through the $70,000 resistance level as spot ETF products registered their strongest weekly inflows since January."
    },
    {
      title = "Asia Pacific Trade Pact Boosts Regional Currency Stability";
      source = "Financial Times";
      url = "https://ft.com";
      urlToImage = "";
      publishedAt = "2026-04-06T06:30:00Z";
      description = "A newly ratified multilateral trade agreement among Asia-Pacific nations has contributed to reduced forex volatility across the region."
    },
    {
      title = "Oil Prices Stabilise as OPEC+ Maintains Output Targets";
      source = "CNBC";
      url = "https://cnbc.com";
      urlToImage = "";
      publishedAt = "2026-04-06T06:00:00Z";
      description = "Crude oil prices markets found equilibrium after OPEC+ confirmed its current production targets would remain unchanged through Q3, easing supply uncertainty."
    },
  ];

  transient let mockYouTubeVideos : [YouTubeVideo] = [
    { videoId = "WEDIj9JBTC8"; title = "How Global Markets Work: A Beginners Guide"; thumbnail = "https://i.ytimg.com/vi/WEDIj9JBTC8/mqdefault.jpg"; channelTitle = "The Plain Bagel" },
    { videoId = "Rm-GDsHFMJQ"; title = "Financial Literacy: What Everyone Should Know"; thumbnail = "https://i.ytimg.com/vi/Rm-GDsHFMJQ/mqdefault.jpg"; channelTitle = "Practical Wisdom" },
    { videoId = "PHe0bXAIuk0"; title = "How the Stock Market Works"; thumbnail = "https://i.ytimg.com/vi/PHe0bXAIuk0/mqdefault.jpg"; channelTitle = "Khan Academy" },
    { videoId = "d9uTH0iprVQ"; title = "Understanding Forex Markets for Beginners"; thumbnail = "https://i.ytimg.com/vi/d9uTH0iprVQ/mqdefault.jpg"; channelTitle = "Trading 212" },
    { videoId = "ZCFkWDdmXG8"; title = "Crypto Explained: Bitcoin, Ethereum and Beyond"; thumbnail = "https://i.ytimg.com/vi/ZCFkWDdmXG8/mqdefault.jpg"; channelTitle = "Whiteboard Finance" },
    { videoId = "p7HKvqRI_Bo"; title = "Smart Investing Strategies for Long-Term Wealth"; thumbnail = "https://i.ytimg.com/vi/p7HKvqRI_Bo/mqdefault.jpg"; channelTitle = "Graham Stephan" },
  ];

  // ─── JSON helpers ───────────────────────────────────────────────────

  func findKeyPos(s : Text, key : Text) : ?Nat {
    let needle = "\"" # key # "\":";
    let sChars = Text.toArray(s);
    let nChars = Text.toArray(needle);
    let sLen = sChars.size();
    let nLen = nChars.size();
    var i = 0;
    while (i + nLen <= sLen) {
      var matched = true;
      var j = 0;
      while (j < nLen) {
        if (sChars[i + j] != nChars[j]) { matched := false; j := nLen };
        j += 1;
      };
      if (matched) {
        var pos = i + nLen;
        while (pos < sLen and sChars[pos] == ' ') { pos += 1 };
        return ?pos;
      };
      i += 1;
    };
    null
  };

  func extractStr(s : Text, key : Text) : ?Text {
    switch (findKeyPos(s, key)) {
      case null null;
      case (?pos) {
        let chars = Text.toArray(s);
        if (pos >= chars.size() or chars[pos] != '\"') return null;
        var i = pos + 1;
        var acc = "";
        while (i < chars.size() and chars[i] != '\"') {
          if (chars[i] == '\\' and i + 1 < chars.size()) {
            i += 1;
            acc := acc # Text.fromChar(chars[i]);
          } else {
            acc := acc # Text.fromChar(chars[i]);
          };
          i += 1;
        };
        ?acc
      };
    }
  };

  func parseNum(chars : [Char], startPos : Nat) : ?(Float, Nat) {
    let len = chars.size();
    var i = startPos;
    var neg = false;
    if (i < len and chars[i] == '-') { neg := true; i += 1 };
    var intV : Float = 0.0;
    var hasD = false;
    while (i < len and chars[i] >= '0' and chars[i] <= '9') {
      intV := intV * 10.0 + Float.fromInt(Nat32.toNat(Char.toNat32(chars[i])) - 48);
      hasD := true;
      i += 1;
    };
    if (not hasD) return null;
    var frac : Float = 0.0;
    var div : Float = 10.0;
    if (i < len and chars[i] == '.') {
      i += 1;
      while (i < len and chars[i] >= '0' and chars[i] <= '9') {
        frac := frac + Float.fromInt(Nat32.toNat(Char.toNat32(chars[i])) - 48) / div;
        div := div * 10.0;
        i += 1;
      };
    };
    if (i < len and (chars[i] == 'e' or chars[i] == 'E')) {
      i += 1;
      var expNeg = false;
      if (i < len and chars[i] == '-') { expNeg := true; i += 1 }
      else if (i < len and chars[i] == '+') { i += 1 };
      var expV : Nat = 0;
      while (i < len and chars[i] >= '0' and chars[i] <= '9') {
        expV := expV * 10 + (Nat32.toNat(Char.toNat32(chars[i])) - 48);
        i += 1;
      };
      var mult : Float = 1.0;
      var e = 0;
      while (e < expV) { mult := mult * 10.0; e += 1 };
      let scaled = (intV + frac) * (if expNeg 1.0 / mult else mult);
      return ?(if neg -scaled else scaled, i);
    };
    let v = intV + frac;
    ?(if neg -v else v, i)
  };

  func extractNum(s : Text, key : Text) : ?Float {
    switch (findKeyPos(s, key)) {
      case null null;
      case (?pos) {
        let chars = Text.toArray(s);
        if (pos >= chars.size()) return null;
        switch (parseNum(chars, pos)) {
          case null null;
          case (?(v, _)) ?v;
        }
      };
    }
  };

  func splitObjects(s : Text) : [Text] {
    let chars = Text.toArray(s);
    let len = chars.size();
    var depth = 0;
    var start = 0;
    var inStr = false;
    var prevWasBackslash = false;
    var i = 0;
    var result : [Text] = [];
    while (i < len) {
      let c = chars[i];
      if (c == '\"' and not prevWasBackslash) {
        inStr := not inStr;
      } else if (not inStr) {
        if (c == '{') {
          if (depth == 0) { start := i };
          depth += 1;
        } else if (c == '}') {
          if (depth > 0) { depth -= 1 };
          if (depth == 0) {
            var obj = "";
            var j = start;
            while (j <= i) { obj := obj # Text.fromChar(chars[j]); j += 1 };
            result := Array.append(result, [obj]);
          };
        };
      };
      prevWasBackslash := (c == '\\' and not prevWasBackslash);
      i += 1;
    };
    result
  };

  // ─── Parsers ───────────────────────────────────────────────────────

  func parseStocks(json : Text) : ?[StockQuote] {
    let objs = splitObjects(json);
    if (objs.size() == 0) return null;
    var out : [StockQuote] = [];
    for (obj in objs.vals()) {
      let sym = switch (extractStr(obj, "symbol"))            { case (?v) v; case null "" };
      let nm  = switch (extractStr(obj, "name"))              { case (?v) v; case null sym };
      let pr  = switch (extractNum(obj, "price"))             { case (?v) v; case null 0.0 };
      let pct = switch (extractNum(obj, "changesPercentage")) { case (?v) v; case null 0.0 };
      if (sym != "") {
        out := Array.append(out, [{ symbol = sym; name = nm; price = pr; changesPercentage = pct }]);
      };
    };
    if (out.size() > 0) ?out else null
  };

  func parseCrypto(json : Text) : ?[CryptoQuote] {
    let objs = splitObjects(json);
    if (objs.size() == 0) return null;
    var out : [CryptoQuote] = [];
    for (obj in objs.vals()) {
      let rawSym = switch (extractStr(obj, "symbol")) { case (?v) v; case null "" };
      let sym = if (Text.endsWith(rawSym, #text "USD") and rawSym.size() > 3) {
        let arr = Text.toArray(rawSym);
        var s = "";
        var k = 0;
        while (k + 3 < arr.size()) { s := s # Text.fromChar(arr[k]); k += 1 };
        s
      } else rawSym;
      let nm  = switch (extractStr(obj, "name"))              { case (?v) v; case null sym };
      let pr  = switch (extractNum(obj, "price"))             { case (?v) v; case null 0.0 };
      let pct = switch (extractNum(obj, "changesPercentage")) { case (?v) v; case null 0.0 };
      if (sym != "") {
        out := Array.append(out, [{ symbol = sym; name = nm; price = pr; changesPercentage = pct }]);
      };
    };
    if (out.size() > 0) ?out else null
  };

  func parseForex(json : Text) : ?[ForexRate] {
    let objs = splitObjects(json);
    if (objs.size() == 0) return null;
    let wanted : [Text] = ["USD/NGN", "USD/EUR", "USD/GBP", "USD/CNY", "USD/JPY"];
    var rates : [ForexRate] = [{ symbol = "USD"; rate = 1.0 }];
    for (obj in objs.vals()) {
      let ticker = switch (extractStr(obj, "ticker")) { case (?v) v; case null "" };
      var isWanted = false;
      for (w in wanted.vals()) {
        if (ticker == w) { isWanted := true };
      };
      if (isWanted) {
        let tArr = Text.toArray(ticker);
        let tLen = tArr.size();
        if (tLen >= 3) {
          var quoteSym = "";
          let kStart = tLen - 3 : Nat;
          var k = kStart;
          while (k < tLen) { quoteSym := quoteSym # Text.fromChar(tArr[k]); k += 1 };
          let bid = switch (extractNum(obj, "bid")) { case (?v) v; case null 0.0 };
          if (bid > 0.0) {
            rates := Array.append(rates, [{ symbol = quoteSym; rate = bid }]);
          };
        };
      };
    };
    if (rates.size() > 1) ?rates else null
  };

  func parseNews(json : Text) : ?[NewsArticle] {
    let articlesKey = "\"articles\":";
    let keyChars = Text.toArray(articlesKey);
    let jsonChars = Text.toArray(json);
    let jLen = jsonChars.size();
    let kLen = keyChars.size();
    var startPos : ?Nat = null;
    var i = 0;
    while (i + kLen <= jLen) {
      var matched = true;
      var j = 0;
      while (j < kLen) {
        if (jsonChars[i + j] != keyChars[j]) { matched := false; j := kLen };
        j += 1;
      };
      if (matched) { startPos := ?(i + kLen); i := jLen };
      i += 1;
    };
    let arrStart = switch (startPos) { case null { return null }; case (?p) p };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    let objs = splitObjects(arrStr);
    if (objs.size() == 0) return null;
    var out : [NewsArticle] = [];
    for (obj in objs.vals()) {
      let title = switch (extractStr(obj, "title"))       { case (?v) v; case null "" };
      let url   = switch (extractStr(obj, "url"))         { case (?v) v; case null "" };
      let img   = switch (extractStr(obj, "urlToImage"))  { case (?v) v; case null "" };
      let pubAt = switch (extractStr(obj, "publishedAt")) { case (?v) v; case null "" };
      let desc  = switch (extractStr(obj, "description")) { case (?v) v; case null "" };
      let src = switch (extractStr(obj, "name")) { case (?v) v; case null "Unknown" };
      if (title != "" and title != "[Removed]") {
        out := Array.append(out, [{
          title = title;
          source = src;
          url = url;
          urlToImage = img;
          publishedAt = pubAt;
          description = desc;
        }]);
      };
    };
    if (out.size() > 0) ?out else null
  };

  // Parse YouTube Data API v3 search response
  func parseYouTube(json : Text) : ?[YouTubeVideo] {
    let itemsKey = "\"items\":";
    let keyChars = Text.toArray(itemsKey);
    let jsonChars = Text.toArray(json);
    let jLen = jsonChars.size();
    let kLen = keyChars.size();
    var startPos : ?Nat = null;
    var i = 0;
    while (i + kLen <= jLen) {
      var matched = true;
      var j = 0;
      while (j < kLen) {
        if (jsonChars[i + j] != keyChars[j]) { matched := false; j := kLen };
        j += 1;
      };
      if (matched) { startPos := ?(i + kLen); i := jLen };
      i += 1;
    };
    let arrStart = switch (startPos) { case null { return null }; case (?p) p };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    let objs = splitObjects(arrStr);
    if (objs.size() == 0) return null;
    var out : [YouTubeVideo] = [];
    for (obj in objs.vals()) {
      let vid    = switch (extractStr(obj, "videoId"))     { case (?v) v; case null "" };
      let title  = switch (extractStr(obj, "title"))       { case (?v) v; case null "" };
      let ch     = switch (extractStr(obj, "channelTitle")) { case (?v) v; case null "" };
      let thumb  = switch (extractStr(obj, "url"))         { case (?v) v; case null "" };
      if (vid != "" and title != "") {
        out := Array.append(out, [{ videoId = vid; title = title; thumbnail = thumb; channelTitle = ch }]);
      };
    };
    if (out.size() > 0) ?out else null
  };

  // ─── Historical Price Parser ─────────────────────────────────────────────

  // FMP response: {"symbol":"AAPL","historical":[{"date":"2026-04-04","close":172.4,...},{...},...]
  // historical array is ordered newest-first; we want 7 entries oldest-first
  func parseHistoricalPrices(json : Text) : [Float] {
    // Find "historical":
    let histKey = "\"historical\":";
    let keyChars = Text.toArray(histKey);
    let jsonChars = Text.toArray(json);
    let jLen = jsonChars.size();
    let kLen = keyChars.size();
    var startPos : ?Nat = null;
    var i = 0;
    while (i + kLen <= jLen) {
      var matched = true;
      var j = 0;
      while (j < kLen) {
        if (jsonChars[i + j] != keyChars[j]) { matched := false; j := kLen };
        j += 1;
      };
      if (matched) { startPos := ?(i + kLen); i := jLen };
      i += 1;
    };
    let arrStart = switch (startPos) { case null { return [] }; case (?p) p };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    // splitObjects extracts each {date,close,...} object
    let objs = splitObjects(arrStr);
    // Take up to 7 entries (newest-first from API), extract close prices
    var closes : [Float] = [];
    var count = 0;
    for (obj in objs.vals()) {
      if (count < 7) {
        let closeOpt = extractNum(obj, "close");
        switch (closeOpt) {
          case (?v) {
            closes := Array.append(closes, [v]);
            count += 1;
          };
          case null {};
        };
      };
    };
    // Reverse to get chronological order (oldest first)
    let n = closes.size();
    if (n == 0) return [];
    var reversed : [Float] = [];
    var ri = n;
    while (ri > 0) {
      ri -= 1;
      reversed := Array.append(reversed, [closes[ri]]);
    };
    reversed
  };

  // ─── HTTP helper ───────────────────────────────────────────────────────

  func httpGet(url : Text) : async ?Text {
    let req : IC.http_request_args = {
      url = url;
      method = #get;
      headers = [
        { name = "Accept";     value = "application/json" },
        { name = "User-Agent"; value = "Stancard/1.0" },
      ];
      body = null;
      max_response_bytes = ?500_000;
      transform = null;
      is_replicated = null;
    };
    try {
      let resp = await (with cycles = 230_850_258_000) IC.http_request(req);
      if (resp.status >= 200 and resp.status < 300) {
        Text.decodeUtf8(resp.body)
      } else null
    } catch (_) null
  };

  func httpPost(url : Text, body : Text, authHeader : Text) : async ?Text {
    let bodyBytes = Text.encodeUtf8(body);
    let req : IC.http_request_args = {
      url = url;
      method = #post;
      headers = [
        { name = "Accept";        value = "application/json" },
        { name = "Content-Type";  value = "application/json" },
        { name = "Authorization"; value = "Bearer " # authHeader },
        { name = "User-Agent";    value = "Stancard/1.0" },
      ];
      body = ?bodyBytes;
      max_response_bytes = ?100_000;
      transform = null;
      is_replicated = null;
    };
    try {
      let resp = await (with cycles = 230_850_258_000) IC.http_request(req);
      switch (Text.decodeUtf8(resp.body)) {
        case (?text) ?text;
        case null null;
      }
    } catch (_) null
  };

  // ─── Public API — Market & News ───────────────────────────────────────────────

  public func getMarketData() : async MarketData {
    let now = Int.abs(Time.now());

    let apiKey = "sNm7MnB0SR8L0Cm2nsK4FwCRFoouf6iZ";
    let stockUrl  = "https://financialmodelingprep.com/api/v3/quote/AAPL,GOOGL,TSLA,AMZN,MSFT,META,NVDA,NFLX,BABA,TSM?apikey=" # apiKey;
    let cryptoUrl = "https://financialmodelingprep.com/api/v3/quote/BTCUSD,ETHUSD,BNBUSD?apikey=" # apiKey;
    let forexUrl  = "https://financialmodelingprep.com/api/v3/fx?apikey=" # apiKey;

    let stockResp  = await httpGet(stockUrl);
    let cryptoResp = await httpGet(cryptoUrl);
    let forexResp  = await httpGet(forexUrl);

    let stocks = switch (stockResp)  { case (?j) { switch (parseStocks(j)) { case (?s) s; case null mockStocks } }; case null mockStocks };
    let crypto = switch (cryptoResp) { case (?j) { switch (parseCrypto(j)) { case (?c) c; case null mockCrypto } }; case null mockCrypto };
    let forex  = switch (forexResp)  { case (?j) { switch (parseForex(j))  { case (?f) f; case null mockForex  } }; case null mockForex  };

    {
      stocks;
      forex;
      crypto;
      lastUpdated = now;
      success = stockResp != null and cryptoResp != null and forexResp != null;
    }
  };

  public func getNewsData() : async NewsData {
    let now = Int.abs(Time.now());
    let newsApiKey = "5a09e850daa24f97b2bba80dc8c67e47";
    let newsUrl = "https://newsapi.org/v2/top-headlines?category=business&pageSize=20&apiKey=" # newsApiKey;

    let newsResp = await httpGet(newsUrl);

    let articles = switch (newsResp) {
      case (?j) {
        switch (parseNews(j)) {
          case (?a) a;
          case null mockNews;
        }
      };
      case null mockNews;
    };

    {
      articles;
      lastUpdated = now;
      success = newsResp != null;
    }
  };

  // ─── Public API — YouTube ───────────────────────────────────────────────

  public func getYouTubeVideos() : async [YouTubeVideo] {
    let ytKey = "AIzaSyBZml9-ecTMgl7mj7La5fDfduXCpPuSNWE";
    let ytUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&q=financial+literacy+global+markets&maxResults=6&type=video&key=" # ytKey;

    let resp = await httpGet(ytUrl);
    switch (resp) {
      case (?j) {
        switch (parseYouTube(j)) {
          case (?vids) vids;
          case null mockYouTubeVideos;
        }
      };
      case null mockYouTubeVideos;
    }
  };

  // ─── Public API — YouTube (query-parameterized) ───────────────────────────

  // Replace spaces with '+' for URL query encoding
  func encodeQuery(q : Text) : Text {
    let chars = Text.toArray(q);
    var out = "";
    for (c in chars.vals()) {
      if (c == ' ') { out := out # "+" }
      else { out := out # Text.fromChar(c) };
    };
    out
  };

  public func getYouTubeVideosByQuery(searchQuery : Text) : async [YouTubeVideo] {
    let ytKey = "AIzaSyBZml9-ecTMgl7mj7La5fDfduXCpPuSNWE";
    let encoded = encodeQuery(searchQuery);
    let ytUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" # encoded # "&maxResults=6&type=video&key=" # ytKey;

    let resp = await httpGet(ytUrl);
    switch (resp) {
      case (?j) {
        switch (parseYouTube(j)) {
          case (?vids) vids;
          case null mockYouTubeVideos;
        }
      };
      case null mockYouTubeVideos;
    }
  };

  // ─── Public API — Historical Prices (with 24h canister cache) ─────────────

  public func getHistoricalPrices(symbol : Text) : async [Float] {
    let now = Time.now();
    let twentyFourHoursNs : Int = 86_400_000_000_000;

    // Check cache first
    let cacheMap = HashMap.fromIter<Text, HistoricalCache>(
      historicalPriceCache.vals(), 32, Text.equal, Text.hash
    );
    switch (cacheMap.get(symbol)) {
      case (?cached) {
        if (now - cached.fetchedAt < twentyFourHoursNs) {
          // Cache is fresh — return without hitting API
          return cached.prices;
        };
      };
      case null {};
    };

    // Cache miss or stale — fetch from FMP
    let apiKey = "sNm7MnB0SR8L0Cm2nsK4FwCRFoouf6iZ";
    let url = "https://financialmodelingprep.com/api/v3/historical-price-full/" # symbol # "?timeseries=7&apikey=" # apiKey;
    let resp = await httpGet(url);
    let prices = switch (resp) {
      case null [];
      case (?json) parseHistoricalPrices(json);
    };

    // Store in cache (even if empty, to avoid hammering API on repeated failures)
    if (prices.size() > 0) {
      cacheMap.put(symbol, { prices; fetchedAt = now });
      historicalPriceCache := Iter.toArray(cacheMap.entries());
    };

    prices
  };

  // ─── Public API — Alerts ─────────────────────────────────────────────────

  public func addAlert(assetType : Text, symbol : Text, condition : Text, targetPrice : Float) : async Alert {
    let now = Int.abs(Time.now());
    alertCounter += 1;
    let id = "alert_" # Nat.toText(alertCounter);
    let newAlert : Alert = {
      id;
      assetType;
      symbol;
      condition;
      targetPrice;
      isActive = true;
      isTriggered = false;
      createdAt = now;
    };
    alerts := Array.append(alerts, [newAlert]);
    newAlert
  };

  public func getAlerts() : async [Alert] {
    alerts
  };

  public func updateAlert(id : Text, isActive : Bool) : async Bool {
    var found = false;
    alerts := Array.map<Alert, Alert>(alerts, func(a) {
      if (a.id == id) {
        found := true;
        { id = a.id; assetType = a.assetType; symbol = a.symbol; condition = a.condition;
          targetPrice = a.targetPrice; isActive; isTriggered = a.isTriggered; createdAt = a.createdAt }
      } else a
    });
    found
  };

  public func deleteAlert(id : Text) : async Bool {
    let before = alerts.size();
    alerts := Array.filter<Alert>(alerts, func(a) { a.id != id });
    alerts.size() < before
  };

  public func markAlertTriggered(id : Text) : async Bool {
    var found = false;
    alerts := Array.map<Alert, Alert>(alerts, func(a) {
      if (a.id == id) {
        found := true;
        { id = a.id; assetType = a.assetType; symbol = a.symbol; condition = a.condition;
          targetPrice = a.targetPrice; isActive = a.isActive; isTriggered = true; createdAt = a.createdAt }
      } else a
    });
    found
  };

  public func clearAlertTriggered(id : Text) : async Bool {
    var found = false;
    alerts := Array.map<Alert, Alert>(alerts, func(a) {
      if (a.id == id) {
        found := true;
        { id = a.id; assetType = a.assetType; symbol = a.symbol; condition = a.condition;
          targetPrice = a.targetPrice; isActive = a.isActive; isTriggered = false; createdAt = a.createdAt }
      } else a
    });
    found
  };

  // ─── User Profile ───────────────────────────────────────────────────

  public query (msg) func getUserProfile() : async ?UserProfile {
    let map = HashMap.fromIter<Principal, UserProfile>(
      userProfiles.vals(), 10, Principal.equal, Principal.hash
    );
    map.get(msg.caller)
  };

  public shared (msg) func saveUserProfile(
    displayName : Text,
    preferredCurrency : Text,
    language : Text,
    hideBalance : Bool,
    hideTransactions : Bool
  ) : async UserProfile {
    let map = HashMap.fromIter<Principal, UserProfile>(
      userProfiles.vals(), 10, Principal.equal, Principal.hash
    );
    let profile : UserProfile = {
      displayName;
      preferredCurrency;
      language;
      hideBalance;
      hideTransactions;
    };
    map.put(msg.caller, profile);
    userProfiles := Iter.toArray(map.entries());
    profile
  };


  // ─── Wallet Types ───────────────────────────────────────────────────────

  public type WalletBalance = {
    currency : Text;
    amount : Float;
  };

  public type WalletTransaction = {
    id : Text;
    txType : Text;
    currency : Text;
    amount : Float;
    date : Text;
    desc : Text;
    status : Text;
  };

  // ─── Virtual Account Type ───────────────────────────────────────────────

  public type VirtualAccount = {
    accountNumber : Text;
    bankName : Text;
    accountName : Text;
    expiresAt : Text;
    reference : Text;
  };

  public type VirtualAccountResult = {
    #ok : VirtualAccount;
    #err : Text;
  };

  // ─── Wallet Persistent State ─────────────────────────────────────────────

  var walletBalances : [(Principal, [WalletBalance])] = [];
  var walletTransactions : [(Principal, [WalletTransaction])] = [];
  var virtualAccounts : [(Principal, VirtualAccount)] = [];

  // ─── Wallet Helpers ─────────────────────────────────────────────────────

  func getBalanceMap() : HashMap.HashMap<Principal, [WalletBalance]> {
    HashMap.fromIter<Principal, [WalletBalance]>(
      walletBalances.vals(), 16, Principal.equal, Principal.hash
    )
  };

  func getTxMap() : HashMap.HashMap<Principal, [WalletTransaction]> {
    HashMap.fromIter<Principal, [WalletTransaction]>(
      walletTransactions.vals(), 16, Principal.equal, Principal.hash
    )
  };

  // ─── Wallet Public API ────────────────────────────────────────────────

  public query (msg) func getWalletBalances() : async [WalletBalance] {
    let map = getBalanceMap();
    switch (map.get(msg.caller)) {
      case (?bals) bals;
      case null [];
    }
  };

  public query (msg) func getWalletTransactions() : async [WalletTransaction] {
    let map = getTxMap();
    switch (map.get(msg.caller)) {
      case (?txs) txs;
      case null [];
    }
  };

  public shared (msg) func updateWalletBalance(currency : Text, newAmount : Float) : async WalletBalance {
    let map = getBalanceMap();
    let existing = switch (map.get(msg.caller)) { case (?b) b; case null [] };
    let updated = Array.map(existing, func(b) {
      if (b.currency == currency) { { currency; amount = newAmount } } else b
    });
    let found = Array.find(existing, func(b) { b.currency == currency });
    let final = switch (found) {
      case (?_) updated;
      case null Array.append(updated, [{ currency; amount = newAmount }]);
    };
    map.put(msg.caller, final);
    walletBalances := Iter.toArray(map.entries());
    { currency; amount = newAmount }
  };

  public shared (msg) func addWalletTransaction(
    txType : Text,
    currency : Text,
    amount : Float,
    date : Text,
    desc : Text,
    status : Text
  ) : async WalletTransaction {
    let now = Int.abs(Time.now());
    let id = "tx-" # Nat.toText(now);
    let newTx : WalletTransaction = { id; txType; currency; amount; date; desc; status };
    let map = getTxMap();
    let existing = switch (map.get(msg.caller)) { case (?t) t; case null [] };
    map.put(msg.caller, Array.append([newTx], existing));
    walletTransactions := Iter.toArray(map.entries());
    newTx
  };



  // ─── Send Money (Peer-to-Peer Transfer) ──────────────────────────────────────

  public type SendMoneyResult = {
    #ok : { txId : Text; reference : Text; recipientId : Text; amount : Float; currency : Text; timestamp : Text };
    #err : Text;
  };

  public shared (msg) func sendMoney(
    recipientPrincipal : Text,
    amount : Float,
    currency : Text,
    dateStr : Text
  ) : async SendMoneyResult {
    // Block anonymous callers
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in to send money.");
    };

    // Parse recipient principal
    let recipientOpt : ?Principal = try {
      ?Principal.fromText(recipientPrincipal)
    } catch (_) {
      null
    };
    let recipient = switch (recipientOpt) {
      case null { return #err("Invalid recipient ID.") };
      case (?p) p;
    };

    // Block self-transfer
    if (Principal.equal(msg.caller, recipient)) {
      return #err("You cannot send money to yourself.");
    };

    // Load balance and tx maps
    let balMap = getBalanceMap();
    let txMap = getTxMap();

    // Check sender balance
    let senderBals = switch (balMap.get(msg.caller)) { case (?b) b; case null [] };
    let senderBal : Float = switch (Array.find(senderBals, func(b) { b.currency == currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    if (senderBal < amount) {
      return #err("Insufficient balance.");
    };

    // Check recipient exists in canister
    let recipientBals = switch (balMap.get(recipient)) {
      case (?b) b;
      case null { return #err("Recipient not found — they must have a Stancard account.") };
    };

    // Generate shared reference
    let now = Int.abs(Time.now());
    let txId = "tx-" # Nat.toText(now);
    let reference = "REF-" # Nat.toText(now);

    // Deduct from sender
    let updatedSenderBals = Array.map(senderBals, func(b) {
      if (b.currency == currency) { { currency; amount = senderBal - amount } } else b
    });
    balMap.put(msg.caller, updatedSenderBals);

    // Credit recipient
    let recipientCurBal : Float = switch (Array.find(recipientBals, func(b) { b.currency == currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    let hasRecipientCurrency = switch (Array.find(recipientBals, func(b) { b.currency == currency })) {
      case (?_) true;
      case null false;
    };
    let updatedRecipientBals = if (hasRecipientCurrency) {
      Array.map(recipientBals, func(b) {
        if (b.currency == currency) { { currency; amount = recipientCurBal + amount } } else b
      })
    } else {
      Array.append(recipientBals, [{ currency; amount }])
    };
    balMap.put(recipient, updatedRecipientBals);
    walletBalances := Iter.toArray(balMap.entries());

    // Record sender tx
    let senderDesc = "Sent to " # recipientPrincipal;
    let senderTx : WalletTransaction = { id = txId # "-s"; txType = "send"; currency; amount; date = dateStr; desc = senderDesc; status = "completed" };
    let senderTxs = switch (txMap.get(msg.caller)) { case (?t) t; case null [] };
    txMap.put(msg.caller, Array.append([senderTx], senderTxs));

    // Record recipient tx
    let recipientDesc = "Received from " # Principal.toText(msg.caller);
    let recipientTx : WalletTransaction = { id = txId # "-r"; txType = "receive"; currency; amount; date = dateStr; desc = recipientDesc; status = "completed" };
    let recipientTxs = switch (txMap.get(recipient)) { case (?t) t; case null [] };
    txMap.put(recipient, Array.append([recipientTx], recipientTxs));
    walletTransactions := Iter.toArray(txMap.entries());

    #ok({ txId; reference; recipientId = recipientPrincipal; amount; currency; timestamp = dateStr })
  };


  // ─── Virtual Account Helpers ──────────────────────────────────────────────

  func getVAMap() : HashMap.HashMap<Principal, VirtualAccount> {
    HashMap.fromIter<Principal, VirtualAccount>(
      virtualAccounts.vals(), 16, Principal.equal, Principal.hash
    )
  };

  // ─── Virtual Account Public API ─────────────────────────────────────────────

  public query (msg) func getVirtualAccount() : async ?VirtualAccount {
    let map = getVAMap();
    map.get(msg.caller)
  };

  public shared (msg) func createVirtualAccount(displayName : Text) : async VirtualAccountResult {
    // Return existing account if already stored (expiry check is done client-side)
    let map = getVAMap();
    switch (map.get(msg.caller)) {
      case (?existing) { return #ok(existing) };
      case null {};
    };
    await doCreateVirtualAccount(msg.caller, displayName)
  };

  func doCreateVirtualAccount(caller : Principal, displayName : Text) : async VirtualAccountResult {
    let flwSecretKey = "FLWSECK-dfba4842dc7dcde8b394a8a0426d1a96-19d61e17ff4vt-X";
    let principalText = Principal.toText(caller);
    let principalArr = Text.toArray(principalText);
    var refSuffix = "";
    var ri = 0;
    while (ri < 10 and ri < principalArr.size()) {
      refSuffix := refSuffix # Text.fromChar(principalArr[ri]);
      ri += 1;
    };
    let now = Int.abs(Time.now());
    let reference = "STANCARD-" # refSuffix # "-" # Nat.toText(now);
    let bodyJson = "{\"email\":\"user@stancard.app\",\"is_permanent\":false,\"tx_ref\":\"" # reference # "\",\"amount\":0,\"currency\":\"NGN\",\"narration\":\"" # displayName # "\"}";
    let resp = await httpPost(
      "https://api.flutterwave.com/v3/virtual-account-numbers",
      bodyJson,
      flwSecretKey
    );
    switch (resp) {
      case null { #err("Network error. Please try again.") };
      case (?json) {
        let statusOpt = extractStr(json, "status");
        let isSuccess = switch (statusOpt) {
          case (?s) (s == "success");
          case null false;
        };
        if (not isSuccess) {
          let errMsg = switch (extractStr(json, "message")) {
            case (?m) m;
            case null "Unable to generate account number.";
          };
          return #err(errMsg);
        };
        let accountNumber = switch (extractStr(json, "account_number")) {
          case (?v) v;
          case null "";
        };
        let bankName = switch (extractStr(json, "bank_name")) {
          case (?v) v;
          case null "Flutterwave";
        };
        let accountName = switch (extractStr(json, "account_name")) {
          case (?v) v;
          case null displayName;
        };
        let expiresAt = switch (extractStr(json, "expiry_date")) {
          case (?v) v;
          case null "";
        };
        if (accountNumber == "") {
          return #err("Unable to generate account number. Please try again.");
        };
        let va : VirtualAccount = { accountNumber; bankName; accountName; expiresAt; reference };
        let vaMap = getVAMap();
        vaMap.put(caller, va);
        virtualAccounts := Iter.toArray(vaMap.entries());
        #ok(va)
      };
    }
  };

  public shared (msg) func refreshVirtualAccount(displayName : Text) : async VirtualAccountResult {
    let map = getVAMap();
    map.delete(msg.caller);
    virtualAccounts := Iter.toArray(map.entries());
    await doCreateVirtualAccount(msg.caller, displayName)
  };




  // ─── Stancard Move Module ─────────────────────────────────────────────────

  // Types
  public type RiderRoute = {
    routeId : Text;
    riderPrincipal : Principal;
    vehicleType : Text;
    departureCity : Text;
    departureCountry : Text;
    destinationCity : Text;
    destinationCountry : Text;
    travelDate : Text;
    cargoSpace : Text;
    createdAt : Int;
  };

  public type Package = {
    packageId : Text;
    senderPrincipal : Principal;
    pickupLocation : Text;
    destinationCity : Text;
    destinationCountry : Text;
    size : Text;
    weightKg : Float;
    description : Text;
    createdAt : Int;
  };

  public type DeliveryRequest = {
    requestId : Text;
    packageId : Text;
    senderPrincipal : Principal;
    riderPrincipal : Principal;
    routeId : Text;
    status : Text;
    createdAt : Int;
  };

  public type RequestWithPackage = {
    requestId : Text;
    packageId : Text;
    senderPrincipal : Principal;
    routeId : Text;
    status : Text;
    createdAt : Int;
    pickupLocation : Text;
    destinationCity : Text;
    destinationCountry : Text;
    size : Text;
    weightKg : Float;
    description : Text;
  };

  public type MoveResult = { #ok : Text; #err : Text; };

  // Persistent state
  var riderRoutes : [(Principal, [RiderRoute])] = [];
  var packages : [(Principal, [Package])] = [];
  var deliveryRequests : [DeliveryRequest] = [];
  var routeCounter : Nat = 0;
  var packageCounter : Nat = 0;
  var requestCounter : Nat = 0;

  // Helpers
  func getRouteMap() : HashMap.HashMap<Principal, [RiderRoute]> {
    HashMap.fromIter<Principal, [RiderRoute]>(
      riderRoutes.vals(), 16, Principal.equal, Principal.hash
    )
  };

  func getPackageMap() : HashMap.HashMap<Principal, [Package]> {
    HashMap.fromIter<Principal, [Package]>(
      packages.vals(), 16, Principal.equal, Principal.hash
    )
  };

  func textLower(t : Text) : Text {
    Text.map(t, func(c) {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(Char.toNat32(c) + 32)
      } else c
    })
  };

  // Register a new route
  public shared (msg) func registerRoute(
    vehicleType : Text,
    departureCity : Text,
    departureCountry : Text,
    destinationCity : Text,
    destinationCountry : Text,
    travelDate : Text,
    cargoSpace : Text
  ) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in to register a route.");
    };
    routeCounter += 1;
    let routeId = "route-" # Nat.toText(routeCounter) # "-" # Nat.toText(Int.abs(Time.now()));
    let route : RiderRoute = {
      routeId;
      riderPrincipal = msg.caller;
      vehicleType;
      departureCity;
      departureCountry;
      destinationCity;
      destinationCountry;
      travelDate;
      cargoSpace;
      createdAt = Time.now();
    };
    let map = getRouteMap();
    let existing = switch (map.get(msg.caller)) { case (?r) r; case null [] };
    map.put(msg.caller, Array.append(existing, [route]));
    riderRoutes := Iter.toArray(map.entries());
    #ok(routeId)
  };

  // Update an existing route
  public shared (msg) func updateRoute(
    routeId : Text,
    vehicleType : Text,
    departureCity : Text,
    departureCountry : Text,
    destinationCity : Text,
    destinationCountry : Text,
    travelDate : Text,
    cargoSpace : Text
  ) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in.");
    };
    let map = getRouteMap();
    let existing = switch (map.get(msg.caller)) { case (?r) r; case null [] };
    let found = Array.find(existing, func(r) { r.routeId == routeId });
    switch (found) {
      case null { return #err("Route not found.") };
      case (?_) {
        let updated = Array.map(existing, func(r) {
          if (r.routeId == routeId) {
            { routeId; riderPrincipal = msg.caller; vehicleType; departureCity; departureCountry; destinationCity; destinationCountry; travelDate; cargoSpace; createdAt = r.createdAt }
          } else r
        });
        map.put(msg.caller, updated);
        riderRoutes := Iter.toArray(map.entries());
        #ok("Route updated.")
      };
    }
  };

  // Delete a route
  public shared (msg) func deleteRoute(routeId : Text) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in.");
    };
    let map = getRouteMap();
    let existing = switch (map.get(msg.caller)) { case (?r) r; case null [] };
    let filtered = Array.filter(existing, func(r) { r.routeId != routeId });
    map.put(msg.caller, filtered);
    riderRoutes := Iter.toArray(map.entries());
    #ok("Route deleted.")
  };

  // Get caller's routes
  public query (msg) func getRiderRoutes() : async [RiderRoute] {
    let map = getRouteMap();
    switch (map.get(msg.caller)) { case (?r) r; case null [] }
  };

  // Get all routes (for browse/guest view)
  public query func getAllRoutes() : async [RiderRoute] {
    let map = getRouteMap();
    var all : [RiderRoute] = [];
    for ((_, routes) in map.entries()) {
      all := Array.append(all, routes);
    };
    all
  };

  // Post a package
  public shared (msg) func postPackage(
    pickupLocation : Text,
    destinationCity : Text,
    destinationCountry : Text,
    size : Text,
    weightKg : Float,
    description : Text
  ) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in to post a package.");
    };
    packageCounter += 1;
    let packageId = "pkg-" # Nat.toText(packageCounter) # "-" # Nat.toText(Int.abs(Time.now()));
    let pkg : Package = {
      packageId;
      senderPrincipal = msg.caller;
      pickupLocation;
      destinationCity;
      destinationCountry;
      size;
      weightKg;
      description;
      createdAt = Time.now();
    };
    let map = getPackageMap();
    let existing = switch (map.get(msg.caller)) { case (?p) p; case null [] };
    map.put(msg.caller, Array.append(existing, [pkg]));
    packages := Iter.toArray(map.entries());
    #ok(packageId)
  };

  // Get caller's packages
  public query (msg) func getSenderPackages() : async [Package] {
    let map = getPackageMap();
    switch (map.get(msg.caller)) { case (?p) p; case null [] }
  };

  // Get matched riders for a destination
  public query func getMatchedRiders(destinationCity : Text, destinationCountry : Text) : async [RiderRoute] {
    let targetCity = textLower(destinationCity);
    let targetCountry = textLower(destinationCountry);
    let map = getRouteMap();
    var matched : [RiderRoute] = [];
    for ((_, routes) in map.entries()) {
      for (route in routes.vals()) {
        let matchCity = textLower(route.destinationCity) == targetCity;
        let matchCountry = textLower(route.destinationCountry) == targetCountry;
        if (matchCity and matchCountry) {
          matched := Array.append(matched, [route]);
        };
      };
    };
    matched
  };

  // Send a delivery request
  public shared (msg) func sendDeliveryRequest(
    packageId : Text,
    routeId : Text,
    riderPrincipalText : Text
  ) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in to send a request.");
    };
    // Block duplicate requests for same package+route
    let dupCheck = Array.find(deliveryRequests, func(r) {
      r.packageId == packageId and r.routeId == routeId and Principal.equal(r.senderPrincipal, msg.caller)
    });
    switch (dupCheck) {
      case (?_) { return #err("You already sent a request for this package to this rider.") };
      case null {};
    };
    let riderOpt : ?Principal = try { ?Principal.fromText(riderPrincipalText) } catch (_) { null };
    let riderPrincipal = switch (riderOpt) {
      case null { return #err("Invalid rider ID.") };
      case (?p) p;
    };
    requestCounter += 1;
    let requestId = "req-" # Nat.toText(requestCounter) # "-" # Nat.toText(Int.abs(Time.now()));
    let req : DeliveryRequest = {
      requestId;
      packageId;
      senderPrincipal = msg.caller;
      riderPrincipal;
      routeId;
      status = "Pending";
      createdAt = Time.now();
    };
    deliveryRequests := Array.append(deliveryRequests, [req]);
    #ok(requestId)
  };

  // Get incoming requests for rider (with full package details)
  public query (msg) func getIncomingRequests() : async [RequestWithPackage] {
    let routeMap = getRouteMap();
    let myRoutes = switch (routeMap.get(msg.caller)) { case (?r) r; case null [] };
    let myRouteIds = Array.map(myRoutes, func(r) { r.routeId });
    let pkgMap = getPackageMap();
    var result : [RequestWithPackage] = [];
    for (req in deliveryRequests.vals()) {
      let isMyRoute = Array.find(myRouteIds, func(id) { id == req.routeId });
      switch (isMyRoute) {
        case null {};
        case (?_) {
          // Find the package
          var foundPkg : ?Package = null;
          for ((_, pkgs) in pkgMap.entries()) {
            for (pkg in pkgs.vals()) {
              if (pkg.packageId == req.packageId) {
                foundPkg := ?pkg;
              };
            };
          };
          switch (foundPkg) {
            case null {};
            case (?pkg) {
              let rwp : RequestWithPackage = {
                requestId = req.requestId;
                packageId = req.packageId;
                senderPrincipal = req.senderPrincipal;
                routeId = req.routeId;
                status = req.status;
                createdAt = req.createdAt;
                pickupLocation = pkg.pickupLocation;
                destinationCity = pkg.destinationCity;
                destinationCountry = pkg.destinationCountry;
                size = pkg.size;
                weightKg = pkg.weightKg;
                description = pkg.description;
              };
              result := Array.append(result, [rwp]);
            };
          };
        };
      };
    };
    result
  };

  // Respond to a delivery request (accept or decline)
  public shared (msg) func respondToRequest(requestId : Text, accept : Bool) : async MoveResult {
    if (Principal.isAnonymous(msg.caller)) {
      return #err("You must be signed in.");
    };
    let found = Array.find(deliveryRequests, func(r) { r.requestId == requestId });
    switch (found) {
      case null { return #err("Request not found.") };
      case (?req) {
        if (not Principal.equal(req.riderPrincipal, msg.caller)) {
          return #err("You are not the rider for this request.");
        };
        let newStatus = if (accept) "Accepted" else "Declined";
        deliveryRequests := Array.map(deliveryRequests, func(r) {
          if (r.requestId == requestId) {
            { requestId = r.requestId; packageId = r.packageId; senderPrincipal = r.senderPrincipal; riderPrincipal = r.riderPrincipal; routeId = r.routeId; status = newStatus; createdAt = r.createdAt }
          } else r
        });
        #ok("Request " # newStatus # ".")
      };
    }
  };

  // Get sender's own requests
  public query (msg) func getSenderRequests() : async [DeliveryRequest] {
    Array.filter(deliveryRequests, func(r) { Principal.equal(r.senderPrincipal, msg.caller) })
  };

  // Get rider's accepted deliveries
  public query (msg) func getAcceptedDeliveries() : async [DeliveryRequest] {
    Array.filter(deliveryRequests, func(r) {
      Principal.equal(r.riderPrincipal, msg.caller) and r.status == "Accepted"
    })
  };

}
