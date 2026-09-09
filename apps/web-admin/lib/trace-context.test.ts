import assert from "node:assert/strict";
import { addTraceparentHeader, createTraceparent } from "./trace-context";

const TRACEPARENT_PATTERN = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

assert.match(createTraceparent(), TRACEPARENT_PATTERN);

const generatedHeaders = new Headers();
addTraceparentHeader(generatedHeaders);
assert.match(generatedHeaders.get("traceparent") ?? "", TRACEPARENT_PATTERN);

const suppliedHeaders = new Headers({ traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01" });
addTraceparentHeader(suppliedHeaders);
assert.equal(suppliedHeaders.get("traceparent"), "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01");

console.log("trace context propagation: ok");
