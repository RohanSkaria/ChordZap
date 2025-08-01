#!/bin/bash


npm install

npm install --workspaces

cd packages/shared
npm run build
cd ../..


if [ ! -f packages/backend/.env ]; then
    cp packages/backend/.env.example packages/backend/.env
fi

echo "setup complete"