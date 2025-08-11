class APIFeatures {
    constructor(query, queryString){
        this.query = query
        this.queryString = queryString
    }
    filter(){
        const queryObj = {...this.queryString}
        const execludedFields = ["limit", "page", "sort", "fields"]

        Object.keys(queryObj).forEach(key => {
            if( execludedFields.includes(queryObj[key]) ){
                delete queryObj[key]
            }
            if(Array.isArray(queryObj[key])){
                queryObj[key] = {$in: queryObj[key]}
            }
        });

        // we need to replace gte, gt, lte, and lt with the mongoDB style (that has $ before)
        let queryStr = JSON.stringify(queryObj)
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`) // regular expression

        this.query.find(JSON.parse(queryStr));
        return this
    }

    // Returns a specific fields of document (.select())
    limitFields(){
        if(this.queryString.fields){
            const fieldsStr = this.queryString.fields.split(",").join(" ")
            this.query.select(fieldsStr)
        }
        return this
    }

    sort(){
        // e.g: sort=price,name
        if(this.queryString.sort){
            const sortBy = this.queryString.sort.split(",").join(" ")
            this.query.sort(sortBy)
        }else{
            this.query.sort("-createdAt")
        }
        return this
    }

    paginate(){
        const page = Number(this.queryString.page) 
        const limit = Number(this.queryString.limit) 
        this.query.skip( ( page-1 ) * limit )
        .limit(limit)
        return this
    }
}

module.exports = APIFeatures