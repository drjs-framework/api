import moment from 'moment';
import jwtDecode from 'jwt-decode';

export default class JwtContainerWrapper {
  static saveTokens(tokenInfo, expiration) {
    const tokenInfoWithDate = Object.assign({
      date: moment.unix(expiration).format(),
      lastRequest: new Date(),
    }, tokenInfo);
    window.localStorage.tokenInfo = JSON.stringify(tokenInfoWithDate);
  }

  static getToken() {
    if (window.localStorage.tokenInfo) {
      return JSON.parse(window.localStorage.tokenInfo).token;
    }
    return null;
  }

  static getRenewToken() {
    return JSON.parse(window.localStorage.tokenInfo).refreshToken;
  }

  static getTokenInfo() {
    if (window.localStorage.tokenInfo) {
      return JSON.parse(window.localStorage.tokenInfo);
    }

    return null;
  }

  static isExpired() {
    const dateToken = JSON.parse(window.localStorage.tokenInfo).date;
    const date = moment(dateToken, 'YYYY-MM-DDTHH:mm:ss');

    const tokenExpired = moment().isAfter(date);
    const trackingActivityTime = configuration.get('trackingActivityTime');
    if (tokenExpired && trackingActivityTime) {
      const lastRequest = moment(JwtContainerWrapper.getLastRequest());
      if (moment().isAfter(lastRequest.add(trackingActivityTime))) {
        return false;
      }
      return true;
    }

    return tokenExpired;
  }

  static removeTokenInfo() {
    window.localStorage.removeItem('tokenInfo');
  }

  static decode(token) {
    return jwtDecode(token);
  }

  static existToken() {
    return window.localStorage.tokenInfo && JSON.parse(window.localStorage.tokenInfo).token;
  }

  static addLastRequest() {
    const tokenInfo = JwtContainerWrapper.getTokenInfo();
    if (tokenInfo) {
      tokenInfo.lastRequest = new Date();
      window.localStorage.tokenInfo = JSON.stringify(tokenInfo);
    }
  }

  static getLastRequest() {
    if (window.localStorage.tokenInfo) {
      return JSON.parse(window.localStorage.tokenInfo).lastRequest;
    }

    return null;
  }
}
