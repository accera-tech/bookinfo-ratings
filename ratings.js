// Copyright 2017 Istio Authors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const RATINGS_PROTO_PATH = `${__dirname}/proto/ratings.proto`;
const HEALTH_PROTO_PATH = `${__dirname}/proto/grpc/health/v1/health.proto`;
const PORT = parseInt(process.argv[2]);

const ratingsProto = _loadProto(RATINGS_PROTO_PATH).ratings;
const healthProto = _loadProto(HEALTH_PROTO_PATH).grpc.health.v1;

var userAddedRatings = []; // used to demonstrate POST functionality

function _loadProto(path) {
  const packageDefinition = protoLoader.loadSync(
    path,
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }
  );
  return grpc.loadPackageDefinition(packageDefinition);
}

function getLocalReviews(productId) {
  if (typeof userAddedRatings[productId] !== 'undefined') {
    return userAddedRatings[productId];
  }

  return {
    id: productId,
    reviewers: [
      {
        id: "1",
        rate: "5"
      },
      {
        id: "2",
        rate: "4"
      }
    ]
  };
}

function putLocalReviews(productId, reviewer) {
  userAddedRatings[productId] = {
    id: productId,
    reviewers: [reviewer]
  };

  return getLocalReviews(productId);
}

function main() {
  var server = new grpc.Server();

  server.addService(ratingsProto.RatingsService.service, {
    get: (call, callback) => {
      var reply = getLocalReviews(call.request.productId);
      callback(null, reply);
    },
    put: (call, callback) => {
      var reply = putLocalReviews(call.request.productId, call.request.reviewer);
      callback(null, reply);
    }
  });

  server.addService(healthProto.Health.service, {
    check: (_, callback) => {
      callback(null, { status: 'SERVING' });
    }
  });

  server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
  server.start();
}

main();