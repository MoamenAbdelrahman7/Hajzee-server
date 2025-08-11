exports.includeFieldsFilter = (reqBody, allowedFields )=>{
    
    const filteredBody = {}
    if(!reqBody){ return {} }
    Object.keys(reqBody).map(el=>{
        if(allowedFields.includes(el)){
            filteredBody[el] = reqBody[el]
        }
    })    
    return filteredBody
}

exports.excludeFieldsFilter = (reqBody, excludedFields )=>{
    
    const filteredBody = {}
    if(!reqBody){ return {} }
    Object.keys(reqBody).map(el=>{
        if(!excludedFields.includes(el)){
            filteredBody[el] = reqBody[el]
        }
    })   
    return filteredBody
}