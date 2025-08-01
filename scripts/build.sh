#!/bin/bash

echo "build shared"
cd packages/shared
npm run build
cd ../..

echo "build backend"
cd packages/backend
npm run build
cd ../..

echo "build frontend"
cd packages/frontend
npm run build
cd ../..

echo "build complete"