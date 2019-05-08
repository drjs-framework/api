import request from 'superagent';
import { getRoute } from '@drjs/router';
import { AuthActions } from '@drjs/actions';
import JwtContainer from './helpers/JwtContainer';

export default class ApiDefault {
  static POST = 'POST';
  static PUT = 'PUT';
  static GET = 'GET';
  static HEAD = 'HEAD';
  static DELETE = 'DELETE';
  static PATCH = 'PATCH';

  static NOT_RENEW_ERROR = 'not_renew';

  getRequest(method, url) {
    const localRequest = request(method, url)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');

    JwtContainer.addLastRequest();
    if (__DEVELOPMENT__) {
      const { end } = localRequest;
      const newEnd = (cb) => {
        const timeIni = new Date().getTime();
        end.call(localRequest, (err, res) => {
          const timeFin = new Date().getTime();
          if (log) {
            log.debug('Time request => ', timeFin - timeIni);
          }
          cb(err, res);
        });
      };

      localRequest.end = newEnd;
    }

    return localRequest;
  }

  getSecuredRequest(method, url) {
    const localRequest = this.getRequest(method, url);

    if (!JwtContainer.existToken()) {
      throw new Error('Logged exception');
    }

    if (JwtContainer.isExpired()) {
      if (JwtContainer.haveRenewToken()) {
        this.overwriteEnd(localRequest);
      } else {
        this.overwriteEndWithErrorRenew(localRequest);
      }
    } else {
      this.setHeaderAuth(localRequest);
    }
    return localRequest;
  }

  getUrl(routeName, parameters, pagination) {
    if (pagination) {
      Object.assign(parameters, pagination.getQuery());
    }

    if (log) {
      log.debug('routeName', routeName);
      log.debug('routeName parameters', parameters);
    }

    const url = decodeURIComponent(getRoute(routeName, parameters, { absolute: true }));

    if (log) {
      log.debug('Calling api => ', url);
    }

    return url;
  }

  getAuthToken() {
    return JwtContainer.getToken();
  }

  getRenewToken() {
    return JwtContainer.getRenewToken();
  }

  setBearerHeader(req, authToken) {
    req.set('Authorization', `Bearer ${authToken}`);
    return req;
  }

  setHeaderAuth(req) {
    this.setBearerHeader(req, this.getAuthToken());
  }

  renewToken = (req, cb) => {
    const url = this.getUrl('api.api_jwt_refresh_token');
    this.getRequest('POST', url)
      .type('form')
      .send({ refresh_token: this.getRenewToken() })
      .end((err, res) => {
        if (err) {
          if (cb && typeof cb === 'function') {
            cb(err);
          }
        } else {
          const store = configuration.get('store');
          store.dispatch(AuthActions.saveToken(res.body));
          if (req) {
            this.setHeaderAuth(req);
          }
          if (cb && typeof cb === 'function') {
            cb(null, res);
          }
        }
      });
  }

  overwriteEnd(req) {
    const { end } = req;
    const newEnd = (cb) => {
      this.renewToken(req, (err) => {
        if (err) {
          cb(err);
        } else {
          end.call(req, cb);
        }
      });
    };
    req.end = newEnd; // eslint-disable-line no-param-reassign
  }

  overwriteEndWithErrorRenew(req) {
    const newEnd = (cb) => {
      cb(ApiDefault.NOT_RENEW_ERROR);
    };

    req.end = newEnd;
  }

  getDefaultPagination(currentPagination) {
    return Object.assign({}, {
      offset: 0,
      items: configuration.get('resultsPerPage'),
    }, currentPagination);
  }
}
