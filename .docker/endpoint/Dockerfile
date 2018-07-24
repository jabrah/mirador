FROM tomcat:8.5.31-jre8-8.5.31-jre8-alpine@sha256:f9a53932a3cc61ea3a1c307e7bf60897bce356c60c61beb0a1d1cdc5c13c9b83

ENV IIIF_IMAGE_SCHEME=https \
    IIIF_IMAGE_HOST=rosetest.library.jhu.edu \
    IIIF_IMAGE_PORT=443 \
    IIIF_IMAGE_PREFIX=/iiif \
    IIIF_PRES_SCHEME=http \
    IIIF_PRES_HOST=localhost \
    IIIF_PRES_PORT=8080 \
    IIIF_PRES_PREFIX=iiif-pres \
    GIT_PRES_URL=https://github.com/jhu-digital-manuscripts/rosa2

EXPOSE ${IIIF_PRES_PORT}

COPY *.war ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX}.war

# RUN apk update && \
#     apk add --no-cache ca-certificates git maven openjdk8 && \
#     git clone https://github.com/jhu-digital-manuscripts/lucene-latin-stemmer && \
#     cd lucene-latin-stemmer/ && \
#     echo "Running 'mvn install'" && \
#     mvn install -Dmaven.test.skip=true -q
#     # git clone ${GIT_PRES_URL} && \
#     # cd rosa2/ && \

# WORKDIR /code

# RUN ls -la . && \
#     mvn clean install -Diiif.pres.scheme=${IIIF_PRES_SCHEME} -Diiif.pres.port=${IIIF_PRES_PORT}\
#       -Diiif.pres.host=${IIIF_PRES_HOST} -Diiif.pres.prefix=${IIIF_PRES_PREFIX} \
#       -Diiif.image.scheme=${IIIF_IMAGE_SCHEME} -Diiif.image.port=${IIIF_IMAGE_PORT} \
#       -Diiif.image.host=${IIIF_IMAGE_HOST} -Diiif.image.prefix=${IIIF_IMAGE_PREFIX} \
#       -Darchive.path=archive/ -Dmaven.test.skip=true

# COPY rosa2/rosa-iiif/rosa-iiif-presentation-endpoint/target/*.war ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX}.war

RUN mkdir ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX}/ && \
    unzip ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX}.war -qd ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX} && \
    rm ${CATALINA_HOME}/webapps/${IIIF_PRES_PREFIX}.war

CMD ["catalina.sh", "run"]

