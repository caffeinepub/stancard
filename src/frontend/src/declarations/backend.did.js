// @ts-nocheck
/* eslint-disable */

export const idlFactory = ({ IDL }) => {
  const StockQuote = IDL.Record({
    symbol: IDL.Text,
    name: IDL.Text,
    price: IDL.Float64,
    changesPercentage: IDL.Float64,
  });
  const ForexRate = IDL.Record({
    symbol: IDL.Text,
    rate: IDL.Float64,
  });
  const CryptoQuote = IDL.Record({
    symbol: IDL.Text,
    name: IDL.Text,
    price: IDL.Float64,
    changesPercentage: IDL.Float64,
  });
  const MarketData = IDL.Record({
    stocks: IDL.Vec(StockQuote),
    forex: IDL.Vec(ForexRate),
    crypto: IDL.Vec(CryptoQuote),
    lastUpdated: IDL.Nat,
    success: IDL.Bool,
  });
  const NewsArticle = IDL.Record({
    title: IDL.Text,
    source: IDL.Text,
    url: IDL.Text,
    urlToImage: IDL.Text,
    publishedAt: IDL.Text,
    description: IDL.Text,
  });
  const NewsData = IDL.Record({
    articles: IDL.Vec(NewsArticle),
    lastUpdated: IDL.Nat,
    success: IDL.Bool,
  });
  return IDL.Service({
    getMarketData: IDL.Func([], [MarketData], []),
    getNewsData: IDL.Func([], [NewsData], []),
  });
};

export const init = ({ IDL }) => [];
