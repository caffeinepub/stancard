import Text "mo:core/Text";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Debug "mo:core/Debug";
import IC "ic:aaaaa-aa";
import AdminTypes "types/admin";
import AdminLib "lib/admin";
import AdminMixin "mixins/admin-api";



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
  let userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();
  let historicalPriceCache : Map.Map<Text, HistoricalCache> = Map.empty<Text, HistoricalCache>();

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
    let sChars = s.toArray();
    let nChars = needle.toArray();
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
      case null {
        Debug.print("extractStr: key '" # key # "' not found");
        null
      };
      case (?pos) {
        let chars = s.toArray();
        if (pos >= chars.size() or chars[pos] != '\"') {
          Debug.print("extractStr: key '" # key # "' found but value is not a string at pos " # pos.toText());
          return null;
        };
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
      intV := intV * 10.0 + (chars[i].toNat32().toNat() - 48).toFloat();
      hasD := true;
      i += 1;
    };
    if (not hasD) return null;
    var frac : Float = 0.0;
    var div : Float = 10.0;
    if (i < len and chars[i] == '.') {
      i += 1;
      while (i < len and chars[i] >= '0' and chars[i] <= '9') {
        frac := frac + (chars[i].toNat32().toNat() - 48).toFloat() / div;
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
        expV := expV * 10 + (chars[i].toNat32().toNat() - 48);
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
      case null {
        Debug.print("extractNum: key '" # key # "' not found");
        null
      };
      case (?pos) {
        let chars = s.toArray();
        if (pos >= chars.size()) {
          Debug.print("extractNum: key '" # key # "' found but pos " # pos.toText() # " is out of bounds");
          return null;
        };
        switch (parseNum(chars, pos)) {
          case null {
            Debug.print("extractNum: key '" # key # "' could not parse number at pos " # pos.toText());
            null
          };
          case (?(v, _)) ?v;
        }
      };
    }
  };

  func splitObjects(s : Text) : [Text] {
    let chars = s.toArray();
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
            result := result.concat([obj]);
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
    if (objs.size() == 0) {
      Debug.print("parseStocks: no JSON objects found in response");
      return null;
    };
    var out : [StockQuote] = [];
    for (obj in objs.vals()) {
      let sym = switch (extractStr(obj, "symbol"))            { case (?v) v; case null "" };
      let nm  = switch (extractStr(obj, "name"))              { case (?v) v; case null sym };
      let pr  = switch (extractNum(obj, "price"))             { case (?v) v; case null 0.0 };
      let pct = switch (extractNum(obj, "changesPercentage")) { case (?v) v; case null 0.0 };
      if (sym != "") {
        out := out.concat([{ symbol = sym; name = nm; price = pr; changesPercentage = pct }]);
      };
    };
    if (out.size() > 0) ?out else {
      Debug.print("parseStocks: parsed 0 valid stock quotes");
      null
    }
  };

  func parseCrypto(json : Text) : ?[CryptoQuote] {
    let objs = splitObjects(json);
    if (objs.size() == 0) {
      Debug.print("parseCrypto: no JSON objects found in response");
      return null;
    };
    var out : [CryptoQuote] = [];
    for (obj in objs.vals()) {
      let rawSym = switch (extractStr(obj, "symbol")) { case (?v) v; case null "" };
      let sym = if (rawSym.endsWith(#text "USD") and rawSym.size() > 3) {
        let arr = rawSym.toArray();
        var s = "";
        var k = 0;
        while (k + 3 < arr.size()) { s := s # Text.fromChar(arr[k]); k += 1 };
        s
      } else rawSym;
      let nm  = switch (extractStr(obj, "name"))              { case (?v) v; case null sym };
      let pr  = switch (extractNum(obj, "price"))             { case (?v) v; case null 0.0 };
      let pct = switch (extractNum(obj, "changesPercentage")) { case (?v) v; case null 0.0 };
      if (sym != "") {
        out := out.concat([{ symbol = sym; name = nm; price = pr; changesPercentage = pct }]);
      };
    };
    if (out.size() > 0) ?out else {
      Debug.print("parseCrypto: parsed 0 valid crypto quotes");
      null
    }
  };

  func parseForex(json : Text) : ?[ForexRate] {
    let objs = splitObjects(json);
    if (objs.size() == 0) {
      Debug.print("parseForex: no JSON objects found in response");
      return null;
    };
    let wanted : [Text] = ["USD/NGN", "USD/EUR", "USD/GBP", "USD/CNY", "USD/JPY"];
    var rates : [ForexRate] = [{ symbol = "USD"; rate = 1.0 }];
    for (obj in objs.vals()) {
      let ticker = switch (extractStr(obj, "ticker")) { case (?v) v; case null "" };
      var isWanted = false;
      for (w in wanted.vals()) {
        if (ticker == w) { isWanted := true };
      };
      if (isWanted) {
        let tArr = ticker.toArray();
        let tLen = tArr.size();
        if (tLen >= 3) {
          var quoteSym = "";
          let kStart = tLen - 3 : Nat;
          var k = kStart;
          while (k < tLen) { quoteSym := quoteSym # Text.fromChar(tArr[k]); k += 1 };
          let bid = switch (extractNum(obj, "bid")) { case (?v) v; case null 0.0 };
          if (bid > 0.0) {
            rates := rates.concat([{ symbol = quoteSym; rate = bid }]);
          };
        };
      };
    };
    if (rates.size() > 1) ?rates else {
      Debug.print("parseForex: no wanted forex pairs found in response");
      null
    }
  };

  func parseNews(json : Text) : ?[NewsArticle] {
    let articlesKey = "\"articles\":";
    let keyChars = articlesKey.toArray();
    let jsonChars = json.toArray();
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
    let arrStart = switch (startPos) {
      case null {
        Debug.print("parseNews: 'articles' key not found in response");
        return null;
      };
      case (?p) p;
    };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    let objs = splitObjects(arrStr);
    if (objs.size() == 0) {
      Debug.print("parseNews: no article objects found after 'articles' key");
      return null;
    };
    var out : [NewsArticle] = [];
    for (obj in objs.vals()) {
      let title = switch (extractStr(obj, "title"))       { case (?v) v; case null "" };
      let url   = switch (extractStr(obj, "url"))         { case (?v) v; case null "" };
      let img   = switch (extractStr(obj, "urlToImage"))  { case (?v) v; case null "" };
      let pubAt = switch (extractStr(obj, "publishedAt")) { case (?v) v; case null "" };
      let desc  = switch (extractStr(obj, "description")) { case (?v) v; case null "" };
      let src = switch (extractStr(obj, "name")) { case (?v) v; case null "Unknown" };
      if (title != "" and title != "[Removed]") {
        out := out.concat([{
          title = title;
          source = src;
          url = url;
          urlToImage = img;
          publishedAt = pubAt;
          description = desc;
        }]);
      };
    };
    if (out.size() > 0) ?out else {
      Debug.print("parseNews: parsed 0 valid articles");
      null
    }
  };

  // Parse YouTube Data API v3 search response
  func parseYouTube(json : Text) : ?[YouTubeVideo] {
    let itemsKey = "\"items\":";
    let keyChars = itemsKey.toArray();
    let jsonChars = json.toArray();
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
    let arrStart = switch (startPos) {
      case null {
        Debug.print("parseYouTube: 'items' key not found in response");
        return null;
      };
      case (?p) p;
    };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    let objs = splitObjects(arrStr);
    if (objs.size() == 0) {
      Debug.print("parseYouTube: no item objects found after 'items' key");
      return null;
    };
    var out : [YouTubeVideo] = [];
    for (obj in objs.vals()) {
      let vid    = switch (extractStr(obj, "videoId"))      { case (?v) v; case null "" };
      let title  = switch (extractStr(obj, "title"))        { case (?v) v; case null "" };
      let ch     = switch (extractStr(obj, "channelTitle")) { case (?v) v; case null "" };
      let thumb  = switch (extractStr(obj, "url"))          { case (?v) v; case null "" };
      if (vid != "" and title != "") {
        out := out.concat([{ videoId = vid; title = title; thumbnail = thumb; channelTitle = ch }]);
      };
    };
    if (out.size() > 0) ?out else {
      Debug.print("parseYouTube: parsed 0 valid video items");
      null
    }
  };

  // ─── Historical Price Parser ─────────────────────────────────────────────

  // FMP response: {"symbol":"AAPL","historical":[{"date":"2026-04-04","close":172.4,...},{...},...]
  // historical array is ordered newest-first; we want 7 entries oldest-first
  func parseHistoricalPrices(json : Text) : [Float] {
    let histKey = "\"historical\":";
    let keyChars = histKey.toArray();
    let jsonChars = json.toArray();
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
    let arrStart = switch (startPos) {
      case null {
        Debug.print("parseHistoricalPrices: 'historical' key not found");
        return [];
      };
      case (?p) p;
    };
    var arrStr = "";
    var k = arrStart;
    while (k < jLen) { arrStr := arrStr # Text.fromChar(jsonChars[k]); k += 1 };
    let objs = splitObjects(arrStr);
    var closes : [Float] = [];
    var count = 0;
    for (obj in objs.vals()) {
      if (count < 7) {
        let closeOpt = extractNum(obj, "close");
        switch (closeOpt) {
          case (?v) {
            closes := closes.concat([v]);
            count += 1;
          };
          case null {};
        };
      };
    };
    // Reverse to get chronological order (oldest first)
    closes.reverse()
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
        resp.body.decodeUtf8()
      } else null
    } catch (_) null
  };

  func httpPost(url : Text, body : Text, authHeader : Text) : async ?Text {
    let bodyBytes = body.encodeUtf8();
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
      switch (resp.body.decodeUtf8()) {
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
    let chars = q.toArray();
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
    switch (historicalPriceCache.get(symbol)) {
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
      historicalPriceCache.add(symbol, { prices; fetchedAt = now });
    };

    prices
  };

  // ─── Public API — Historical Forex Prices (with 24h canister cache) ──────

  public func getHistoricalForex(symbol : Text) : async [Float] {
    let now = Time.now();
    let twentyFourHoursNs : Int = 86_400_000_000_000;

    // Check same cache as stocks/crypto
    switch (historicalPriceCache.get(symbol)) {
      case (?cached) {
        if (now - cached.fetchedAt < twentyFourHoursNs) {
          return cached.prices;
        };
      };
      case null {};
    };

    // Cache miss or stale — fetch from FMP forex historical endpoint
    let apiKey = "sNm7MnB0SR8L0Cm2nsK4FwCRFoouf6iZ";
    let url = "https://financialmodelingprep.com/api/v3/historical-price-full/" # symbol # "?timeseries=7&apikey=" # apiKey;
    let resp = await httpGet(url);
    let prices = switch (resp) {
      case null [];
      case (?json) parseHistoricalPrices(json);
    };

    if (prices.size() > 0) {
      historicalPriceCache.add(symbol, { prices; fetchedAt = now });
    };

    prices
  };

  // ─── Public API — Alerts ─────────────────────────────────────────────────

  public func addAlert(assetType : Text, symbol : Text, condition : Text, targetPrice : Float) : async Alert {
    let now = Int.abs(Time.now());
    alertCounter += 1;
    let id = "alert_" # alertCounter.toText();
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
    alerts := alerts.concat([newAlert]);
    newAlert
  };

  public func getAlerts() : async [Alert] {
    alerts
  };

  public func updateAlert(id : Text, isActive : Bool) : async Bool {
    var found = false;
    alerts := alerts.map<Alert, Alert>(func(a) {
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
    alerts := alerts.filter(func(a) { a.id != id });
    alerts.size() < before
  };

  public func markAlertTriggered(id : Text) : async Bool {
    var found = false;
    alerts := alerts.map<Alert, Alert>(func(a) {
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
    alerts := alerts.map<Alert, Alert>(func(a) {
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
    userProfiles.get(msg.caller)
  };

  public shared (msg) func saveUserProfile(
    displayName : Text,
    preferredCurrency : Text,
    language : Text,
    hideBalance : Bool,
    hideTransactions : Bool
  ) : async UserProfile {
    let profile : UserProfile = {
      displayName;
      preferredCurrency;
      language;
      hideBalance;
      hideTransactions;
    };
    userProfiles.add(msg.caller, profile);
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

  let walletBalances : Map.Map<Principal, [WalletBalance]> = Map.empty<Principal, [WalletBalance]>();
  let walletTransactions : Map.Map<Principal, [WalletTransaction]> = Map.empty<Principal, [WalletTransaction]>();
  let virtualAccounts : Map.Map<Principal, VirtualAccount> = Map.empty<Principal, VirtualAccount>();

  // ─── Wallet Public API ────────────────────────────────────────────────

  public query (msg) func getWalletBalances() : async [WalletBalance] {
    switch (walletBalances.get(msg.caller)) {
      case (?bals) bals;
      case null [];
    }
  };

  public query (msg) func getWalletTransactions() : async [WalletTransaction] {
    switch (walletTransactions.get(msg.caller)) {
      case (?txs) txs;
      case null [];
    }
  };

  public shared (msg) func updateWalletBalance(currency : Text, newAmount : Float) : async WalletBalance {
    // Principal validation: block anonymous callers
    if (msg.caller.isAnonymous()) {
      return { currency; amount = 0.0 };
    };
    let existing = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
    let updated = existing.map(func(b) {
      if (b.currency == currency) { { currency; amount = newAmount } } else b
    });
    let found = existing.find(func(b) { b.currency == currency });
    let final = switch (found) {
      case (?_) updated;
      case null updated.concat([{ currency; amount = newAmount }]);
    };
    walletBalances.add(msg.caller, final);
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
    // Principal validation: block anonymous callers
    if (msg.caller.isAnonymous()) {
      let id = "tx-anon";
      return { id; txType; currency; amount; date; desc; status };
    };
    let now = Int.abs(Time.now());
    let id = "tx-" # now.toText();
    let newTx : WalletTransaction = { id; txType; currency; amount; date; desc; status };
    let existing = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
    walletTransactions.add(msg.caller, [newTx].concat(existing));
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
    if (msg.caller.isAnonymous()) {
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

    // Check sender balance
    let senderBals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
    let senderBal : Float = switch (senderBals.find(func(b) { b.currency == currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    if (senderBal < amount) {
      return #err("Insufficient balance.");
    };

    // Check recipient exists in canister
    let recipientBals = switch (walletBalances.get(recipient)) {
      case (?b) b;
      case null { return #err("Recipient not found — they must have a Stancard account.") };
    };

    // Generate shared reference
    let now = Int.abs(Time.now());
    let txId = "tx-" # now.toText();
    let reference = "REF-" # now.toText();

    // Deduct from sender
    let updatedSenderBals = senderBals.map(func(b) {
      if (b.currency == currency) { { currency; amount = senderBal - amount } } else b
    });
    walletBalances.add(msg.caller, updatedSenderBals);

    // Credit recipient
    let recipientCurBal : Float = switch (recipientBals.find(func(b) { b.currency == currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    let hasRecipientCurrency = switch (recipientBals.find(func(b) { b.currency == currency })) {
      case (?_) true;
      case null false;
    };
    let updatedRecipientBals = if (hasRecipientCurrency) {
      recipientBals.map(func(b) {
        if (b.currency == currency) { { currency; amount = recipientCurBal + amount } } else b
      })
    } else {
      recipientBals.concat([{ currency; amount }])
    };
    walletBalances.add(recipient, updatedRecipientBals);

    // Record sender tx
    let senderDesc = "Sent to " # recipientPrincipal;
    let senderTx : WalletTransaction = { id = txId # "-s"; txType = "send"; currency; amount; date = dateStr; desc = senderDesc; status = "completed" };
    let senderTxs = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
    walletTransactions.add(msg.caller, [senderTx].concat(senderTxs));

    // Record recipient tx
    let recipientDesc = "Received from " # msg.caller.toText();
    let recipientTx : WalletTransaction = { id = txId # "-r"; txType = "receive"; currency; amount; date = dateStr; desc = recipientDesc; status = "completed" };
    let recipientTxs = switch (walletTransactions.get(recipient)) { case (?t) t; case null [] };
    walletTransactions.add(recipient, [recipientTx].concat(recipientTxs));

    #ok({ txId; reference; recipientId = recipientPrincipal; amount; currency; timestamp = dateStr })
  };


  // ─── Virtual Account Public API ─────────────────────────────────────────────

  public query (msg) func getVirtualAccount() : async ?VirtualAccount {
    virtualAccounts.get(msg.caller)
  };

  public shared (msg) func createVirtualAccount(displayName : Text) : async VirtualAccountResult {
    // Return existing account if already stored (expiry check is done client-side)
    switch (virtualAccounts.get(msg.caller)) {
      case (?existing) { return #ok(existing) };
      case null {};
    };
    await doCreateVirtualAccount(msg.caller, displayName)
  };

  // Extract a substring between the first '{' and its matching '}' after a given key
  func extractDataObject(json : Text) : ?Text {
    let dataKey = "\"data\":";
    let keyChars = dataKey.toArray();
    let jsonChars = json.toArray();
    let jLen = jsonChars.size();
    let kLen = keyChars.size();
    // Find "data": in the JSON
    var keyStart : ?Nat = null;
    var i = 0;
    while (i + kLen <= jLen) {
      var matched = true;
      var j = 0;
      while (j < kLen) {
        if (jsonChars[i + j] != keyChars[j]) { matched := false; j := kLen };
        j += 1;
      };
      if (matched) { keyStart := ?(i + kLen); i := jLen };
      i += 1;
    };
    let objStart = switch (keyStart) {
      case null { return null };
      case (?p) p;
    };
    // Skip whitespace to find '{'
    var pos = objStart;
    while (pos < jLen and jsonChars[pos] == ' ') { pos += 1 };
    if (pos >= jLen or jsonChars[pos] != '{') { return null };
    // Extract balanced object
    var depth = 0;
    var inStr = false;
    var prevBackslash = false;
    var obj = "";
    var k = pos;
    var done = false;
    while (k < jLen and not done) {
      let c = jsonChars[k];
      obj := obj # Text.fromChar(c);
      if (c == '\"' and not prevBackslash) {
        inStr := not inStr;
      } else if (not inStr) {
        if (c == '{') { depth += 1 }
        else if (c == '}') {
          if (depth > 0) { depth -= 1 };
          if (depth == 0) { done := true };
        };
      };
      prevBackslash := (c == '\\' and not prevBackslash);
      k += 1;
    };
    if (done) ?obj else null
  };

  func doCreateVirtualAccount(caller : Principal, displayName : Text) : async VirtualAccountResult {
    let flwSecretKey = "FLWSECK-dfba4842dc7dcde8b394a8a0426d1a96-19d61e17ff4vt-X";
    let principalText = caller.toText();
    let principalArr = principalText.toArray();
    // Build short principal suffix for email (first 8 alphanumeric chars)
    var shortPrincipal = "";
    var ri = 0;
    while (ri < principalArr.size() and shortPrincipal.size() < 8) {
      let c = principalArr[ri];
      if ((c >= 'a' and c <= 'z') or (c >= '0' and c <= '9')) {
        shortPrincipal := shortPrincipal # Text.fromChar(c);
      };
      ri += 1;
    };
    let email = "user-" # shortPrincipal # "@stancard.space";
    // Build tx_ref using short principal + timestamp
    var refSuffix = "";
    var rj = 0;
    while (rj < 10 and rj < principalArr.size()) {
      refSuffix := refSuffix # Text.fromChar(principalArr[rj]);
      rj += 1;
    };
    let now = Int.abs(Time.now());
    let reference = "STANCARD-" # refSuffix # "-" # now.toText();
    let bodyJson = "{\"email\":\"" # email # "\",\"is_permanent\":false,\"bvn\":\"00000000000\",\"tx_ref\":\"" # reference # "\",\"amount\":0,\"frequency\":1,\"narration\":\"Stancard NGN Wallet\",\"currency\":\"NGN\"}";
    // Use a dedicated POST with smaller max_response_bytes for this endpoint
    let bodyBytes = bodyJson.encodeUtf8();
    let req : IC.http_request_args = {
      url = "https://api.flutterwave.com/v3/virtual-account-numbers";
      method = #post;
      headers = [
        { name = "Accept";        value = "application/json" },
        { name = "Content-Type";  value = "application/json" },
        { name = "Authorization"; value = "Bearer " # flwSecretKey },
        { name = "User-Agent";    value = "Stancard/1.0" },
      ];
      body = ?bodyBytes;
      max_response_bytes = ?4096;
      transform = null;
      is_replicated = null;
    };
    let respOpt : ?Text = try {
      let resp = await (with cycles = 20_000_000_000) IC.http_request(req);
      switch (resp.body.decodeUtf8()) {
        case (?text) ?text;
        case null null;
      }
    } catch (_) null;

    switch (respOpt) {
      case null { #err("Network error. Please try again.") };
      case (?json) {
        Debug.print("Flutterwave response: " # json);
        let statusOpt = extractStr(json, "status");
        let isSuccess = switch (statusOpt) {
          case (?s) (s == "success");
          case null false;
        };
        if (not isSuccess) {
          let errMsg = switch (extractStr(json, "message")) {
            case (?m) "Flutterwave error: " # m;
            case null "Unable to generate account number.";
          };
          return #err(errMsg);
        };
        // Extract account data from the nested "data" object
        let dataJson = switch (extractDataObject(json)) {
          case (?d) d;
          case null json; // fall back to top-level if no data wrapper
        };
        let accountNumber = switch (extractStr(dataJson, "account_number")) {
          case (?v) v;
          case null "";
        };
        let bankName = switch (extractStr(dataJson, "bank_name")) {
          case (?v) v;
          case null "WEMA BANK";
        };
        let accountName = switch (extractStr(dataJson, "account_name")) {
          case (?v) v;
          case null displayName;
        };
        let expiresAt = switch (extractStr(dataJson, "expiry_date")) {
          case (?v) v;
          case null "";
        };
        if (accountNumber == "") {
          // Log the raw response for debugging
          Debug.print("doCreateVirtualAccount: account_number empty in dataJson: " # dataJson);
          return #err("Unable to generate account number. Please try again.");
        };
        let va : VirtualAccount = { accountNumber; bankName; accountName; expiresAt; reference };
        virtualAccounts.add(caller, va);
        #ok(va)
      };
    }
  };

  public shared (msg) func refreshVirtualAccount(displayName : Text) : async VirtualAccountResult {
    virtualAccounts.remove(msg.caller);
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

  public type TrackingEntry = {
    status : Text;
    timestamp : Int;
  };

  public type ShipmentTracking = {
    trackingCode : Text;
    requestId : Text;
    packageId : Text;
    entries : [TrackingEntry];
    currentStatus : Text;
  };

  public type AcceptedDeliveryWithTracking = {
    requestId : Text;
    packageId : Text;
    senderPrincipal : Principal;
    riderPrincipal : Principal;
    routeId : Text;
    status : Text;
    createdAt : Int;
    trackingCode : Text;
    trackingEntries : [TrackingEntry];
  };

  public type RiderVerification = {
    riderPrincipal : Principal;
    nationalIdNumber : Text;
    licenseNumber : Text;
    licenseType : Text;
    vehicleRegistrationNumber : Text;
    nationalIdDocUrl : ?Text;
    licenseDocUrl : ?Text;
    vehicleRegDocUrl : ?Text;
    verifiedAt : Int;
  };

  public type SenderVerification = {
    senderPrincipal : Principal;
    phoneNumber : Text;
    nationalIdNumber : Text;
    nationalIdDocUrl : ?Text;
    verifiedAt : Int;
  };

  // Persistent state
  let riderRoutes : Map.Map<Principal, [RiderRoute]> = Map.empty<Principal, [RiderRoute]>();
  let packages : Map.Map<Principal, [Package]> = Map.empty<Principal, [Package]>();
  var deliveryRequests : [DeliveryRequest] = [];
  var routeCounter : Nat = 0;
  var packageCounter : Nat = 0;
  var requestCounter : Nat = 0;

  // ─── Tracking State ──────────────────────────────────────────────────────
  var shipmentTrackings : [ShipmentTracking] = [];
  var trackingCounter : Nat = 0;

  // ─── Verification State ──────────────────────────────────────────────────
  let riderVerifications : Map.Map<Principal, RiderVerification> = Map.empty<Principal, RiderVerification>();
  let senderVerifications : Map.Map<Principal, SenderVerification> = Map.empty<Principal, SenderVerification>();

  // Zero-pad a Nat to 8 digits for tracking codes
  func zeroPad8(n : Nat) : Text {
    let s = n.toText();
    let len = s.size();
    if (len >= 8) { s }
    else {
      var pad = "";
      var i = len;
      while (i < 8) { pad := pad # "0"; i += 1 };
      pad # s
    }
  };

  func textLower(t : Text) : Text {
    t.map(func(c) {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(c.toNat32() + 32)
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
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to register a route.");
    };
    routeCounter += 1;
    let routeId = "route-" # routeCounter.toText() # "-" # Int.abs(Time.now()).toText();
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
    let existing = switch (riderRoutes.get(msg.caller)) { case (?r) r; case null [] };
    riderRoutes.add(msg.caller, existing.concat([route]));
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
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    let existing = switch (riderRoutes.get(msg.caller)) { case (?r) r; case null [] };
    let found = existing.find(func(r) { r.routeId == routeId });
    switch (found) {
      case null { return #err("Route not found.") };
      case (?_) {
        let updated = existing.map(func(r) {
          if (r.routeId == routeId) {
            { routeId; riderPrincipal = msg.caller; vehicleType; departureCity; departureCountry; destinationCity; destinationCountry; travelDate; cargoSpace; createdAt = r.createdAt }
          } else r
        });
        riderRoutes.add(msg.caller, updated);
        #ok("Route updated.")
      };
    }
  };

  // Delete a route
  public shared (msg) func deleteRoute(routeId : Text) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    let existing = switch (riderRoutes.get(msg.caller)) { case (?r) r; case null [] };
    let filtered = existing.filter(func(r) { r.routeId != routeId });
    riderRoutes.add(msg.caller, filtered);
    #ok("Route deleted.")
  };

  // Get caller's routes
  public query (msg) func getRiderRoutes() : async [RiderRoute] {
    switch (riderRoutes.get(msg.caller)) { case (?r) r; case null [] }
  };

  // Get all routes (for browse/guest view)
  public query func getAllRoutes() : async [RiderRoute] {
    var all : [RiderRoute] = [];
    for ((_, routes) in riderRoutes.entries()) {
      all := all.concat(routes);
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
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to post a package.");
    };
    packageCounter += 1;
    let packageId = "pkg-" # packageCounter.toText() # "-" # Int.abs(Time.now()).toText();
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
    let existing = switch (packages.get(msg.caller)) { case (?p) p; case null [] };
    packages.add(msg.caller, existing.concat([pkg]));
    #ok(packageId)
  };

  // Get caller's packages
  public query (msg) func getSenderPackages() : async [Package] {
    switch (packages.get(msg.caller)) { case (?p) p; case null [] }
  };

  // Get matched riders for a destination
  public query func getMatchedRiders(destinationCity : Text, destinationCountry : Text) : async [RiderRoute] {
    let targetCity = textLower(destinationCity);
    let targetCountry = textLower(destinationCountry);
    var matched : [RiderRoute] = [];
    for ((_, routes) in riderRoutes.entries()) {
      for (route in routes.vals()) {
        let matchCity = textLower(route.destinationCity) == targetCity;
        let matchCountry = textLower(route.destinationCountry) == targetCountry;
        if (matchCity and matchCountry) {
          matched := matched.concat([route]);
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
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to send a request.");
    };
    // Block duplicate requests for same package+route
    let dupCheck = deliveryRequests.find(func(r) {
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
    let requestId = "req-" # requestCounter.toText() # "-" # Int.abs(Time.now()).toText();
    let req : DeliveryRequest = {
      requestId;
      packageId;
      senderPrincipal = msg.caller;
      riderPrincipal;
      routeId;
      status = "Pending";
      createdAt = Time.now();
    };
    deliveryRequests := deliveryRequests.concat([req]);
    #ok(requestId)
  };

  // Get incoming requests for rider (with full package details)
  public query (msg) func getIncomingRequests() : async [RequestWithPackage] {
    let myRoutes = switch (riderRoutes.get(msg.caller)) { case (?r) r; case null [] };
    let myRouteIds = myRoutes.map(func(r) { r.routeId });
    var result : [RequestWithPackage] = [];
    for (req in deliveryRequests.vals()) {
      let isMyRoute = myRouteIds.find(func(id) { id == req.routeId });
      switch (isMyRoute) {
        case null {};
        case (?_) {
          // Find the package
          var foundPkg : ?Package = null;
          for ((_, pkgs) in packages.entries()) {
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
              result := result.concat([rwp]);
            };
          };
        };
      };
    };
    result
  };

  // Respond to a delivery request (accept or decline)
  public shared (msg) func respondToRequest(requestId : Text, accept : Bool) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    let found = deliveryRequests.find(func(r) { r.requestId == requestId });
    switch (found) {
      case null { return #err("Request not found.") };
      case (?req) {
        if (not Principal.equal(req.riderPrincipal, msg.caller)) {
          return #err("You are not the rider for this request.");
        };
        let newStatus = if (accept) "Accepted" else "Declined";
        deliveryRequests := deliveryRequests.map<DeliveryRequest, DeliveryRequest>(func(r) {
          if (r.requestId == requestId) {
            { requestId = r.requestId; packageId = r.packageId; senderPrincipal = r.senderPrincipal; riderPrincipal = r.riderPrincipal; routeId = r.routeId; status = newStatus; createdAt = r.createdAt }
          } else r
        });
        // Generate tracking code on accept
        if (accept) {
          trackingCounter += 1;
          let padded = zeroPad8(trackingCounter);
          let code = "MOVE-" # padded;
          let entry : TrackingEntry = { status = "Accepted"; timestamp = Time.now() };
          let tracking : ShipmentTracking = {
            trackingCode = code;
            requestId;
            packageId = req.packageId;
            entries = [entry];
            currentStatus = "Accepted";
          };
          shipmentTrackings := shipmentTrackings.concat([tracking]);
        };
        #ok("Request " # newStatus # ".")
      };
    }
  };

  // Get sender's own requests
  public query (msg) func getSenderRequests() : async [DeliveryRequest] {
    deliveryRequests.filter(func(r) { Principal.equal(r.senderPrincipal, msg.caller) })
  };

  // Get rider's accepted deliveries (legacy, returns only Accepted status)
  public query (msg) func getAcceptedDeliveries() : async [DeliveryRequest] {
    deliveryRequests.filter(func(r) {
      Principal.equal(r.riderPrincipal, msg.caller) and r.status == "Accepted"
    })
  };

  // Get rider's accepted deliveries enriched with tracking info
  public query (msg) func getAcceptedDeliveriesWithTracking() : async [AcceptedDeliveryWithTracking] {
    let active = deliveryRequests.filter(func(r) {
      Principal.equal(r.riderPrincipal, msg.caller) and
      (r.status == "Accepted" or r.status == "In Transit" or r.status == "Delivered")
    });
    active.map<DeliveryRequest, AcceptedDeliveryWithTracking>(func(r) {
      let trackOpt = shipmentTrackings.find(func(t) { t.requestId == r.requestId });
      let (code, entries) = switch (trackOpt) {
        case (?t) (t.trackingCode, t.entries);
        case null ("", []);
      };
      {
        requestId = r.requestId;
        packageId = r.packageId;
        senderPrincipal = r.senderPrincipal;
        riderPrincipal = r.riderPrincipal;
        routeId = r.routeId;
        status = r.status;
        createdAt = r.createdAt;
        trackingCode = code;
        trackingEntries = entries;
      }
    })
  };

  // Update shipment status (rider only, linear progression)
  public shared (msg) func updateShipmentStatus(requestId : Text, newStatus : Text) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    let reqOpt = deliveryRequests.find(func(r) { r.requestId == requestId });
    switch (reqOpt) {
      case null { return #err("Request not found.") };
      case (?req) {
        if (not Principal.equal(req.riderPrincipal, msg.caller)) {
          return #err("You are not the rider for this shipment.");
        };
        // Validate linear progression
        let currentStatus = req.status;
        let valid = (currentStatus == "Accepted" and newStatus == "In Transit") or
                    (currentStatus == "In Transit" and newStatus == "Delivered");
        if (not valid) {
          return #err("Invalid status transition from " # currentStatus # " to " # newStatus # ".");
        };
        // Update delivery request status
        deliveryRequests := deliveryRequests.map<DeliveryRequest, DeliveryRequest>(func(r) {
          if (r.requestId == requestId) {
            { requestId = r.requestId; packageId = r.packageId; senderPrincipal = r.senderPrincipal; riderPrincipal = r.riderPrincipal; routeId = r.routeId; status = newStatus; createdAt = r.createdAt }
          } else r
        });
        // Append tracking entry
        let entry : TrackingEntry = { status = newStatus; timestamp = Time.now() };
        shipmentTrackings := shipmentTrackings.map<ShipmentTracking, ShipmentTracking>(func(t) {
          if (t.requestId == requestId) {
            { trackingCode = t.trackingCode; requestId = t.requestId; packageId = t.packageId; entries = t.entries.concat([entry]); currentStatus = newStatus }
          } else t
        });
        #ok("Status updated to " # newStatus # ".")
      };
    }
  };

  // Public tracking lookup by code (no auth required)
  public query func getTrackingByCode(code : Text) : async ?ShipmentTracking {
    shipmentTrackings.find(func(t) { t.trackingCode == code })
  };

  // Public tracking lookup by request ID (no auth required)
  public query func getTrackingByRequestId(requestId : Text) : async ?ShipmentTracking {
    shipmentTrackings.find(func(t) { t.requestId == requestId })
  };

  // Get tracking for sender's requests
  public query (msg) func getSenderTrackings() : async [ShipmentTracking] {
    let myRequests = deliveryRequests.filter(func(r) { Principal.equal(r.senderPrincipal, msg.caller) });
    let myRequestIds = myRequests.map(func(r) { r.requestId });
    shipmentTrackings.filter(func(t) {
      switch (myRequestIds.find(func(id) { id == t.requestId })) {
        case (?_) true;
        case null false;
      }
    })
  };


  // ─── Move Payment Functions ───────────────────────────────────────────────

  // Get caller's balance for a specific currency
  public query (msg) func getWalletBalance(currency : Text) : async Float {
    let bals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
    switch (bals.find(func(b) { b.currency == currency })) {
      case (?b) b.amount;
      case null 0.0;
    }
  };

  // Record a Move payment: deduct wallet if method="wallet", send delivery request, log transaction
  public shared (msg) func recordMovePayment(
    packageId : Text,
    routeId : Text,
    riderPrincipalText : Text,
    amount : Float,
    currency : Text,
    _reference : Text,
    method : Text,
    dateStr : Text
  ) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to make a payment.");
    };

    // Parse rider principal
    let riderOpt : ?Principal = try { ?Principal.fromText(riderPrincipalText) } catch (_) { null };
    let riderPrincipal = switch (riderOpt) {
      case null { return #err("Invalid rider ID.") };
      case (?p) p;
    };

    // If wallet method, validate and deduct balance
    if (method == "wallet") {
      let bals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
      let curBal : Float = switch (bals.find(func(b) { b.currency == currency })) {
        case (?b) b.amount;
        case null 0.0;
      };
      if (curBal < amount) {
        return #err("Insufficient wallet balance.");
      };
      let hasCur = switch (bals.find(func(b) { b.currency == currency })) {
        case (?_) true;
        case null false;
      };
      let updatedBals = if (hasCur) {
        bals.map(func(b) {
          if (b.currency == currency) { { currency; amount = curBal - amount } } else b
        })
      } else {
        bals // shouldn't happen if balance check passed
      };
      walletBalances.add(msg.caller, updatedBals);
    };

    // Block duplicate requests for same package+route
    let dupCheck = deliveryRequests.find(func(r) {
      r.packageId == packageId and r.routeId == routeId and Principal.equal(r.senderPrincipal, msg.caller)
    });
    switch (dupCheck) {
      case (?_) { return #err("You already sent a request for this package to this rider.") };
      case null {};
    };

    // Create delivery request
    requestCounter += 1;
    let requestId = "req-" # requestCounter.toText() # "-" # Int.abs(Time.now()).toText();
    let req : DeliveryRequest = {
      requestId;
      packageId;
      senderPrincipal = msg.caller;
      riderPrincipal;
      routeId;
      status = "Pending";
      createdAt = Time.now();
    };
    deliveryRequests := deliveryRequests.concat([req]);

    // Record transaction in Stancard Pay history
    let txNow = Int.abs(Time.now());
    let txId = "tx-move-" # txNow.toText();
    let desc = "Move delivery fee — " # packageId;
    let newTx : WalletTransaction = { id = txId; txType = "send"; currency; amount; date = dateStr; desc; status = "completed" };
    let existingTxs = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
    walletTransactions.add(msg.caller, [newTx].concat(existingTxs));

    #ok(requestId)
  };

  // ─── Identity Verification Functions ─────────────────────────────────────

  // Submit or update rider verification record
  public shared (msg) func submitRiderVerification(
    nationalIdNumber : Text,
    licenseNumber : Text,
    licenseType : Text,
    vehicleRegistrationNumber : Text,
    nationalIdDocUrl : ?Text,
    licenseDocUrl : ?Text,
    vehicleRegDocUrl : ?Text
  ) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to submit verification.");
    };
    let record : RiderVerification = {
      riderPrincipal = msg.caller;
      nationalIdNumber;
      licenseNumber;
      licenseType;
      vehicleRegistrationNumber;
      nationalIdDocUrl;
      licenseDocUrl;
      vehicleRegDocUrl;
      verifiedAt = Time.now();
    };
    riderVerifications.add(msg.caller, record);
    #ok("Verification saved")
  };

  // Get caller's rider verification record
  public query (msg) func getRiderVerification() : async ?RiderVerification {
    if (msg.caller.isAnonymous()) { return null };
    riderVerifications.get(msg.caller)
  };

  // Submit or update sender verification record
  public shared (msg) func submitSenderVerification(
    phoneNumber : Text,
    nationalIdNumber : Text,
    nationalIdDocUrl : ?Text
  ) : async MoveResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to submit verification.");
    };
    let record : SenderVerification = {
      senderPrincipal = msg.caller;
      phoneNumber;
      nationalIdNumber;
      nationalIdDocUrl;
      verifiedAt = Time.now();
    };
    senderVerifications.add(msg.caller, record);
    #ok("Verification saved")
  };

  // Get caller's sender verification record
  public query (msg) func getSenderVerification() : async ?SenderVerification {
    if (msg.caller.isAnonymous()) { return null };
    senderVerifications.get(msg.caller)
  };

  // ─── Savings Goals ───────────────────────────────────────────────────────

  public type SavingsGoal = {
    id : Text;
    name : Text;
    targetAmount : Float;
    lockedAmount : Float;
    currency : Text;
    createdAt : Int;
    isCompleted : Bool;
  };

  public type SavingsGoalResult = {
    #ok : SavingsGoal;
    #err : Text;
  };

  public type UnlockResult = {
    #ok : Float;
    #err : Text;
  };

  let savingsGoals : Map.Map<Principal, [SavingsGoal]> = Map.empty<Principal, [SavingsGoal]>();

  public shared (msg) func createSavingsGoal(
    name : Text,
    targetAmount : Float,
    initialDeposit : Float,
    currency : Text
  ) : async SavingsGoalResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in to create a savings goal.");
    };
    if (name == "") {
      return #err("Goal name cannot be empty.");
    };
    if (targetAmount <= 0.0) {
      return #err("Target amount must be greater than zero.");
    };
    if (initialDeposit < 0.0) {
      return #err("Initial deposit cannot be negative.");
    };
    // Validate initial deposit against wallet balance
    if (initialDeposit > 0.0) {
      let bals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
      let curBal : Float = switch (bals.find(func(b) { b.currency == currency })) {
        case (?b) b.amount;
        case null 0.0;
      };
      if (initialDeposit > curBal) {
        return #err("Insufficient wallet balance for initial deposit.");
      };
      // Deduct initial deposit from wallet
      let updatedBals = bals.map(func(b) {
        if (b.currency == currency) { { currency; amount = curBal - initialDeposit } } else b
      });
      walletBalances.add(msg.caller, updatedBals);
      // Record transaction
      let txNow = Int.abs(Time.now());
      let txId = "tx-goal-lock-" # txNow.toText();
      let newTx : WalletTransaction = {
        id = txId;
        txType = "send";
        currency;
        amount = initialDeposit;
        date = "";
        desc = "Locked for savings goal: " # name;
        status = "completed";
      };
      let existingTxs = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
      walletTransactions.add(msg.caller, [newTx].concat(existingTxs));
    };
    let now = Time.now();
    let goalId = "goal-" # msg.caller.toText() # "-" # Int.abs(now).toText();
    let isCompleted = initialDeposit >= targetAmount;
    let goal : SavingsGoal = {
      id = goalId;
      name;
      targetAmount;
      lockedAmount = initialDeposit;
      currency;
      createdAt = now;
      isCompleted;
    };
    let existing = switch (savingsGoals.get(msg.caller)) { case (?g) g; case null [] };
    savingsGoals.add(msg.caller, existing.concat([goal]));
    #ok(goal)
  };

  public query (msg) func getSavingsGoals() : async [SavingsGoal] {
    switch (savingsGoals.get(msg.caller)) { case (?g) g; case null [] }
  };

  public shared (msg) func addToSavingsGoal(goalId : Text, amount : Float) : async SavingsGoalResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    if (amount <= 0.0) {
      return #err("Amount must be greater than zero.");
    };
    let existing = switch (savingsGoals.get(msg.caller)) { case (?g) g; case null [] };
    let goalOpt = existing.find(func(g) { g.id == goalId });
    let goal = switch (goalOpt) {
      case null { return #err("Savings goal not found.") };
      case (?g) g;
    };
    // Validate wallet balance
    let bals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
    let curBal : Float = switch (bals.find(func(b) { b.currency == goal.currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    if (amount > curBal) {
      return #err("Insufficient wallet balance.");
    };
    // Deduct from wallet
    let updatedBals = bals.map(func(b) {
      if (b.currency == goal.currency) { { currency = goal.currency; amount = curBal - amount } } else b
    });
    walletBalances.add(msg.caller, updatedBals);
    // Record transaction
    let txNow = Int.abs(Time.now());
    let txId = "tx-goal-add-" # txNow.toText();
    let newTx : WalletTransaction = {
      id = txId;
      txType = "send";
      currency = goal.currency;
      amount;
      date = "";
      desc = "Added to savings goal: " # goal.name;
      status = "completed";
    };
    let existingTxs = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
    walletTransactions.add(msg.caller, [newTx].concat(existingTxs));
    // Update goal
    let newLocked = goal.lockedAmount + amount;
    let isCompleted = newLocked >= goal.targetAmount;
    let updatedGoal : SavingsGoal = { goal with lockedAmount = newLocked; isCompleted };
    let updatedGoals = existing.map(func(g) {
      if (g.id == goalId) updatedGoal else g
    });
    savingsGoals.add(msg.caller, updatedGoals);
    #ok(updatedGoal)
  };

  public shared (msg) func unlockSavingsGoal(goalId : Text) : async UnlockResult {
    if (msg.caller.isAnonymous()) {
      return #err("You must be signed in.");
    };
    let existing = switch (savingsGoals.get(msg.caller)) { case (?g) g; case null [] };
    let goalOpt = existing.find(func(g) { g.id == goalId });
    let goal = switch (goalOpt) {
      case null { return #err("Savings goal not found.") };
      case (?g) g;
    };
    if (goal.lockedAmount <= 0.0) {
      return #err("No locked funds to unlock.");
    };
    let unlockedAmount = goal.lockedAmount;
    // Return funds to wallet
    let bals = switch (walletBalances.get(msg.caller)) { case (?b) b; case null [] };
    let curBal : Float = switch (bals.find(func(b) { b.currency == goal.currency })) {
      case (?b) b.amount;
      case null 0.0;
    };
    let hasCur = switch (bals.find(func(b) { b.currency == goal.currency })) {
      case (?_) true;
      case null false;
    };
    let updatedBals = if (hasCur) {
      bals.map(func(b) {
        if (b.currency == goal.currency) { { currency = goal.currency; amount = curBal + unlockedAmount } } else b
      })
    } else {
      bals.concat([{ currency = goal.currency; amount = unlockedAmount }])
    };
    walletBalances.add(msg.caller, updatedBals);
    // Record transaction
    let txNow = Int.abs(Time.now());
    let txId = "tx-goal-unlock-" # txNow.toText();
    let newTx : WalletTransaction = {
      id = txId;
      txType = "receive";
      currency = goal.currency;
      amount = unlockedAmount;
      date = "";
      desc = "Unlocked from savings goal: " # goal.name;
      status = "completed";
    };
    let existingTxs = switch (walletTransactions.get(msg.caller)) { case (?t) t; case null [] };
    walletTransactions.add(msg.caller, [newTx].concat(existingTxs));
    // Remove goal from storage
    let updatedGoals = existing.filter(func(g) { g.id != goalId });
    savingsGoals.add(msg.caller, updatedGoals);
    #ok(unlockedAmount)
  };

  // ─── Admin State ─────────────────────────────────────────────────────────

  // Admin whitelist — seeded with the Stancard founder/admin principal
  let adminWhitelist : Set.Set<Principal> = Set.empty<Principal>();
  adminWhitelist.add(Principal.fromText("rmmgc-fyz2d-prb4x-22bqa-wy72b-7qggc-ct55q-lwuky-dp4qh-wfvxo-lae"));

  // Extended verification maps (with approval status) for admin review
  let riderVerificationsWithStatus : Map.Map<Principal, AdminTypes.RiderVerificationWithStatus> = Map.empty<Principal, AdminTypes.RiderVerificationWithStatus>();
  let senderVerificationsWithStatus : Map.Map<Principal, AdminTypes.SenderVerificationWithStatus> = Map.empty<Principal, AdminTypes.SenderVerificationWithStatus>();

  // Wire admin mixin
  include AdminMixin(adminWhitelist, riderVerificationsWithStatus, senderVerificationsWithStatus);

}
