from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException

def parse_object_id(id_val: str | ObjectId) -> ObjectId:
    if isinstance(id_val, ObjectId):
        return id_val
    if not id_val or not ObjectId.is_valid(str(id_val)):
        raise HTTPException(status_code=400, detail="Invalid ID format.")
    return ObjectId(str(id_val))

def serialize_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    res = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_item(item) for item in v]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
        else:
            res[k] = v
    if "_id" in res and "id" not in res:
        res["id"] = res["_id"]
    return res

def serialize_item(item):
    if isinstance(item, ObjectId):
        return str(item)
    elif isinstance(item, datetime):
        return item.isoformat()
    elif isinstance(item, dict):
        return serialize_doc(item)
    elif isinstance(item, list):
        return [serialize_item(i) for i in item]
    return item

def serialize_docs(docs: list) -> list:
    return [serialize_doc(d) for d in docs]
